// Shared UI primitives: confirmation modal, context menu, pointer-reorder hook
const { useState: useStateUI, useEffect: useEffectUI, useRef: useRefUI, useMemo: useMemoUI } = React;

// ============================================================
// Confirmation modal — replaces window.confirm()
// ============================================================
//
// Usage:
//   const confirm = useConfirm();
//   confirm({ title: "Delete?", body: "...", confirmLabel: "Delete", danger: true }).then(ok => { ... })
//
// Wrap your app in <ConfirmProvider>...</ConfirmProvider>
//
const ConfirmContext = React.createContext(null);
function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    // Fallback: native confirm
    return ({ body }) => Promise.resolve(window.confirm(body || "Are you sure?"));
  }
  return ctx;
}

function ConfirmProvider({ children }) {
  const [pending, setPending] = useStateUI(null); // { opts, resolve }

  const ask = (opts) => new Promise((resolve) => {
    setPending({ opts: opts || {}, resolve });
  });

  const close = (result) => {
    if (pending) pending.resolve(result);
    setPending(null);
  };

  useEffectUI(() => {
    if (!pending) return;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending && (
        <div className="confirm-backdrop" onClick={() => close(false)}>
          <div className="confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">{pending.opts.title || "Confirm"}</div>
            {pending.opts.body && <div className="confirm-body">{pending.opts.body}</div>}
            <div className="confirm-actions">
              <button className="confirm-btn ghost" onClick={() => close(false)}>
                {pending.opts.cancelLabel || "Cancel"}
              </button>
              <button
                className={"confirm-btn " + (pending.opts.danger ? "danger" : "primary")}
                onClick={() => close(true)}
                autoFocus
              >
                {pending.opts.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// ============================================================
// Context menu — generic positioned menu
// ============================================================
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRefUI(null);

  useEffectUI(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    setTimeout(() => {
      window.addEventListener("mousedown", onClick);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Clamp position so menu stays in viewport
  const [adjusted, setAdjusted] = useStateUI({ x, y });
  useEffectUI(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    setAdjusted({ x: Math.min(x, maxX), y: Math.min(y, maxY) });
  }, []);

  return (
    <div ref={ref} className="ctx-menu" style={{ left: adjusted.x, top: adjusted.y }}>
      {items.map((it, i) => {
        if (it.separator) return <div key={i} className="ctx-sep" />;
        if (it.label === undefined) return null;
        return (
          <button
            key={i}
            className={"ctx-item " + (it.danger ? "danger" : "")}
            onClick={() => { it.onClick && it.onClick(); onClose(); }}
            disabled={it.disabled}
          >
            {it.icon && <span className="ctx-icon">{it.icon}</span>}
            <span className="ctx-label">{it.label}</span>
            {it.kbd && <span className="ctx-kbd">{it.kbd}</span>}
            {it.right && <span className="ctx-right">{it.right}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// usePointerReorder — touch-friendly drag-and-drop
// ============================================================
//
// Usage:
//   const { onPointerDown, dragId, dropTargetId } = usePointerReorder({
//     items: layout,
//     getId: (i) => i.id,
//     selector: '[data-widget]',   // CSS selector to identify target cells in DOM
//     getCellId: (el) => el.getAttribute('data-widget'),
//     onReorder: (fromId, toId) => updateLayout(...)
//   });
//
//   <div onPointerDown={(e) => onPointerDown(e, item.id)} ... />
//
function usePointerReorder({ items, getId, selector, getCellId, onReorder, threshold = 6 }) {
  const [dragId, setDragId] = useStateUI(null);
  const [dropTargetId, setDropTargetId] = useStateUI(null);
  const stateRef = useRefUI({});

  const onPointerMove = (e) => {
    const s = stateRef.current;
    if (!s.tracking) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.started && Math.hypot(dx, dy) < threshold) return;
    if (!s.started) {
      s.started = true;
      setDragId(s.id);
      document.body.classList.add("lp-pointer-dragging");
    }
    // Move ghost
    if (s.ghost) {
      s.ghost.style.transform = `translate(${e.clientX - s.ghostX}px, ${e.clientY - s.ghostY}px)`;
    }
    // Hit-test
    let target = document.elementFromPoint(e.clientX, e.clientY);
    while (target && target !== document.body) {
      if (target.matches && target.matches(selector)) break;
      target = target.parentElement;
    }
    if (target && target.matches && target.matches(selector)) {
      const id = getCellId(target);
      if (id !== s.id) {
        if (s.lastDropTarget !== id) {
          s.lastDropTarget = id;
          setDropTargetId(id);
        }
      } else {
        s.lastDropTarget = null;
        setDropTargetId(null);
      }
    } else {
      s.lastDropTarget = null;
      setDropTargetId(null);
    }
  };

  const onPointerUp = () => {
    const s = stateRef.current;
    if (s.started && s.lastDropTarget && onReorder) {
      onReorder(s.id, s.lastDropTarget);
    }
    if (s.ghost && s.ghost.parentNode) s.ghost.parentNode.removeChild(s.ghost);
    document.body.classList.remove("lp-pointer-dragging");
    stateRef.current = {};
    setDragId(null);
    setDropTargetId(null);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };

  const onPointerDown = (e, id, sourceEl) => {
    // ignore right-click & secondary buttons
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const sourceCell = sourceEl || e.currentTarget.closest(selector) || e.currentTarget;
    const rect = sourceCell.getBoundingClientRect();

    // Build a ghost — clone the source cell visually so the user sees what they're dragging
    const ghost = sourceCell.cloneNode(true);
    ghost.classList.add("lp-drag-ghost");
    ghost.style.position = "fixed";
    ghost.style.top = "0";
    ghost.style.left = "0";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "10000";
    ghost.style.opacity = "0.85";
    ghost.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    document.body.appendChild(ghost);

    stateRef.current = {
      tracking: true,
      started: false,
      id,
      startX: e.clientX,
      startY: e.clientY,
      ghost,
      ghostX: e.clientX - rect.left,
      ghostY: e.clientY - rect.top,
      lastDropTarget: null
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  return { onPointerDown, dragId, dropTargetId };
}

// ============================================================
// LazyMount — defers children until scrolled into view
// ============================================================
function LazyMount({ children, rootMargin = "200px", placeholder = null }) {
  const ref = useRefUI(null);
  const [visible, setVisible] = useStateUI(false);

  useEffectUI(() => {
    if (visible) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} style={{ display: "contents" }}>
      {visible ? children : placeholder}
    </div>
  );
}

Object.assign(window, {
  ConfirmProvider, useConfirm, ContextMenu, usePointerReorder, LazyMount
});
