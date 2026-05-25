import React from 'react';
import { User, ChevronDown } from 'lucide-react';
import { type TabId, type NavItem } from '@/pages/admin/types';
import {
  deriveParentActiveBg,
  deriveSidebarHoverBg,
  isLegacyGreenSidebarColor,
} from '@/lib/sidebar-colors';

interface SidebarStyles {
  textColor?: string;
  textActiveColor?: string;
  hoverColor?: string;
  activeBgColor?: string;
  parentActiveBgColor?: string;
}

interface AdminSidebarProps {
  displayPhoto: string;
  displayName: string;
  displayEmail: string;
  displayTipo: string;
  navItems: NavItem[];
  activeTab: string;
  setActiveTab: (id: TabId) => void;
  expandedMenus: string[];
  setExpandedMenus: React.Dispatch<React.SetStateAction<string[]>>;
  theme: string;
  sidebarBgColor?: string;
  sidebarStyles: SidebarStyles;
}

export default function AdminSidebar({
  displayPhoto,
  displayName,
  displayTipo,
  navItems,
  activeTab,
  setActiveTab,
  expandedMenus,
  setExpandedMenus,
  theme,
  sidebarBgColor,
  sidebarStyles,
}: AdminSidebarProps) {
  const hasCustomSidebarBg = !!(sidebarBgColor && theme !== 'dark');
  const parentExplicit = sidebarStyles.parentActiveBgColor;
  const parentIsStaleGreen =
    hasCustomSidebarBg &&
    !!parentExplicit &&
    isLegacyGreenSidebarColor(parentExplicit) &&
    !isLegacyGreenSidebarColor(sidebarBgColor!);
  const resolvedParentActiveBg = parentIsStaleGreen
    ? deriveParentActiveBg(sidebarBgColor!)
    : parentExplicit || (hasCustomSidebarBg ? deriveParentActiveBg(sidebarBgColor!) : undefined);
  const resolvedHoverBg =
    sidebarStyles.hoverColor ||
    (hasCustomSidebarBg ? deriveSidebarHoverBg(sidebarBgColor!) : undefined);

  const isCustom =
    theme !== 'dark' &&
    (hasCustomSidebarBg ||
      sidebarStyles.textColor ||
      sidebarStyles.textActiveColor ||
      sidebarStyles.hoverColor ||
      sidebarStyles.activeBgColor ||
      sidebarStyles.parentActiveBgColor);

  return (
    <>
      {/* User Profile */}
      <div className="admin-sidebar-profile">
        <div className="admin-sidebar-avatar">
          {displayPhoto ? (
            <img src={displayPhoto} alt={displayName} />
          ) : (
            <User style={{ width: 28, height: 28 }} />
          )}
        </div>
        <div className="flex flex-col items-center min-w-0">
          <p
            className="admin-sidebar-username truncate w-full"
            style={isCustom && sidebarStyles.textColor ? { color: sidebarStyles.textColor } : {}}
          >
            {displayName.toUpperCase()}
          </p>
          <p
            className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-widest truncate mt-0.5"
            style={isCustom && sidebarStyles.textColor ? { color: sidebarStyles.textColor, opacity: 0.7 } : {}}
          >
            {displayTipo}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="admin-sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isParentActive = item.subItems?.some(s => s.id === activeTab);
          const isDirectActive = !item.subItems && activeTab === item.id;
          const isExpanded = expandedMenus.includes(item.id);

          const itemClass = [
            'admin-nav-item',
            isDirectActive ? 'active' : '',
            isParentActive ? 'parent-active' : '',
          ].filter(Boolean).join(' ');

          const customItemStyle = isCustom
            ? {
                ...(isDirectActive
                  ? {
                      color: sidebarStyles.textActiveColor || undefined,
                      backgroundColor: sidebarStyles.activeBgColor || undefined,
                    }
                  : isParentActive
                  ? {
                      color: sidebarStyles.textActiveColor || undefined,
                      backgroundColor: resolvedParentActiveBg || undefined,
                    }
                  : {
                      color: sidebarStyles.textColor || undefined,
                    }),
                '--nav-hover-bg': resolvedHoverBg || 'rgba(255,255,255,0.05)',
              } as React.CSSProperties
            : {};

          return (
            <div key={item.id}>
              <button
                className={itemClass}
                style={customItemStyle}
                onClick={() => {
                  if (item.subItems) {
                    setExpandedMenus(prev =>
                      prev.includes(item.id) ? prev.filter(m => m !== item.id) : [...prev, item.id]
                    );
                  } else {
                    setActiveTab(item.id as TabId);
                  }
                }}
              >
                <Icon
                  className="nav-icon"
                  style={
                    isCustom && (isDirectActive || isParentActive) && sidebarStyles.textActiveColor
                      ? { color: sidebarStyles.textActiveColor }
                      : {}
                  }
                />
                <span className="nav-label">{item.label}</span>
                {item.count !== undefined && (
                  <span className={`admin-nav-badge${item.badge ? ' danger' : ''}`}>{item.count}</span>
                )}
                {item.subItems && (
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      opacity: 0.6,
                      ...(isCustom && (isDirectActive || isParentActive) && sidebarStyles.textActiveColor
                        ? { color: sidebarStyles.textActiveColor }
                        : {}),
                    }}
                    className={`admin-chevron${isExpanded ? ' open' : ''}`}
                  />
                )}
              </button>

              {item.subItems && isExpanded && (
                <div className="admin-nav-subitems">
                  {item.subItems.map(sub => {
                    const SubIcon = sub.icon;
                    const subActive = activeTab === sub.id;

                    const customSubStyle = isCustom
                      ? {
                          ...(subActive
                            ? {
                                color: sidebarStyles.textActiveColor || undefined,
                                backgroundColor: sidebarStyles.activeBgColor || undefined,
                              }
                            : {
                                color: sidebarStyles.textColor || undefined,
                              }),
                          '--nav-hover-bg': resolvedHoverBg || 'rgba(255,255,255,0.05)',
                        } as React.CSSProperties
                      : {};

                    return (
                      <button
                        key={sub.id}
                        className={`admin-nav-subitem${subActive ? ' active' : ''}`}
                        style={customSubStyle}
                        onClick={() => setActiveTab(sub.id)}
                      >
                        <SubIcon
                          className="nav-icon"
                          style={
                            isCustom && subActive && sidebarStyles.textActiveColor
                              ? { color: sidebarStyles.textActiveColor }
                              : {}
                          }
                        />
                        <span style={{ flex: 1 }}>{sub.label}</span>
                        {sub.count !== undefined && <span className="admin-nav-badge">{sub.count}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
