"use client";

interface NavBarProps {
  activeTab: "pallet" | "box" | "container";
  onTabChange: (tab: "pallet" | "box" | "container") => void;
}

export function NavBar({ activeTab, onTabChange }: NavBarProps) {
  const tabs = [
    { id: "pallet", label: "托盘打托", desc: "单箱→托盘排列" },
    { id: "box", label: "装箱计算", desc: "单箱→货柜排列" },
    { id: "container", label: "托装计算", desc: "已打托→货柜装载" },
  ];

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as "pallet" | "box" | "container")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === tab.id
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <span className="font-semibold">{tab.label}</span>
          <span className={`ml-2 text-xs ${activeTab === tab.id ? "text-blue-200" : "text-slate-500"}`}>
            {tab.desc}
          </span>
        </button>
      ))}
    </nav>
  );
}