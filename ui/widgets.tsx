/**
 * Minimal hand-rolled UI widgets.
 *
 * These replace the handful of material-ui 0.15 components the app used
 * (Button, Tabs, Dialog, List, Toolbar). They are deliberately small and
 * unstyled beyond what css/app.less provides, so the app carries no
 * third-party UI dependency.
 */
import React from 'react';
import { createPortal } from 'react-dom';

interface ButtonProps {
  label: string;
  raised?: boolean;
  primary?: boolean;
  secondary?: boolean;
  onClick?: () => void;
}

export function Button({ label, raised, primary, secondary, onClick }: ButtonProps) {
  const classes = [
    'btn',
    raised ? 'btnRaised' : 'btnFlat',
    primary ? 'btnPrimary' : null,
    secondary ? 'btnSecondary' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} onClick={onClick}>
      {label}
    </button>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="toolbar">
      <div className="toolbarGroup">{children}</div>
    </div>
  );
}

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  active: string;
  items: TabItem[];
  onTabClick: (id: string) => void;
}

/**
 * Renders every tab panel (inactive ones hidden) so child DOM — and any refs
 * into it — exists from mount, matching how the old MUI Tabs behaved.
 */
export function Tabs({ active, items, onTabClick }: TabsProps) {
  return (
    <div className="tabs">
      <div className="tabsBar">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={'tab' + (item.id === active ? ' tabActive' : '')}
            onClick={() => onTabClick(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {items.map((item) => (
        <div key={item.id} className={'tabContent ' + (item.id === active ? 'show' : 'hide')}>
          {item.content}
        </div>
      ))}
    </div>
  );
}

interface DialogProps {
  open: boolean;
  title: string;
  onRequestClose: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function Dialog({ open, title, onRequestClose, actions, children }: DialogProps) {
  React.useEffect(() => {
    if (!open) return undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onRequestClose]);

  if (!open) return null;

  const onOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onRequestClose();
  };

  // Portalled to document.body (as MUI 0.15's Dialog was): nested inside the
  // fixed-position .codeEditor, the overlay loses hit-testing against the
  // absolutely-positioned .helpBar in Chrome.
  return createPortal(
    <div className="dialogOverlay" onMouseDown={onOverlayMouseDown}>
      <div className="dialog" role="dialog" aria-label={title}>
        <div className="dialogTitle">{title}</div>
        <div className="dialogContent">{children}</div>
        <div className="dialogActions">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}

interface ListItem {
  key: string;
  text: string;
}

interface ListProps {
  items: ListItem[];
  onItemClick?: (index: number) => void;
}

export function List({ items, onItemClick }: ListProps) {
  return (
    <ul className="list">
      {items.map((item, index) => (
        <li key={item.key} className="listItem" onClick={() => onItemClick?.(index)}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}
