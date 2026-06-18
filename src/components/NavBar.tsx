"use client";

import { useState } from "react";

interface NavBarProps {
  activeTab: "pallet" | "box" | "container";
  onTabChange: (tab: "pallet" | "box" | "container") => void;
}

export function NavBar({ activeTab, onTabChange }: NavBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { id: "pallet", label: "托盘打托", desc: "单箱 → 托盘排列" },
    { id: "box", label: "装箱计算", desc: "单箱 → 货柜排列" },
    { id: "container", label: "托装计算", desc: "已打托 → 货柜装载" },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
      {/* 标题区域 */}
      <div className="flex items-center gap-3">
        <span className="text-slate-300 font-mono text-sm tracking-wider">
          PAL<span className="text-blue-400">*</span>THWHLI<span className="text-blue-400">*</span>CALC
        </span>
        <span className="text-slate-500 text-xs">v1.0</span>
      </div>

      {/* 下拉选择器 */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
        >
          <span className="font-medium">{currentTab.label}</span>
          <span className="text-slate-400 text-xs">{currentTab.desc}</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 下拉菜单 */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-slate-700 rounded-lg shadow-lg border border-slate-600 overflow-hidden z-50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id as "pallet" | "box" | "container");
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-slate-600 transition-colors ${
                  activeTab === tab.id ? "bg-blue-600/20 border-l-2 border-blue-500" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{tab.label}</span>
                  {activeTab === tab.id && (
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-slate-400 text-xs mt-1 block">{tab.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 右侧标签 */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-400 font-mono">
          CN
        </span>
        <span className="px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-400 font-mono">
          v16.1.0
        </span>
      </div>
    </nav>
  );
}