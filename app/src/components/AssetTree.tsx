import { Boxes, Cog, Factory, Layers } from "lucide-react";
import type { TreeNode } from "../utils/assetTree";

interface Props {
  tree: TreeNode;
  selectedId: string | null;
  onSelect: (id: string, type: TreeNode["type"]) => void;
}

function NodeIcon({ type }: { type: TreeNode["type"] }) {
  const size = 14;
  switch (type) {
    case "equipment":
      return <Cog size={size} />;
    case "asset":
      return <Boxes size={size} />;
    case "area":
      return <Layers size={size} />;
    default:
      return <Factory size={size} />;
  }
}

function TreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: Props["onSelect"];
}) {
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id, node.type)}
        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-all ${
          isSelected
            ? "bg-brand-600 text-white shadow-sm dark:bg-accent-700"
            : "text-slate-700 hover:bg-slate-100 hover:pl-3 dark:text-slate-300 dark:hover:bg-brand-700/50"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className={isSelected ? "text-white/90" : "text-slate-500 dark:text-slate-400"}>
          <NodeIcon type={node.type} />
        </span>
        <span className="truncate">{node.label}</span>
      </button>
      {node.children.map((child) => (
        <TreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function AssetTree({ tree, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Asset Hierarchy
      </h3>
      <TreeItem node={tree} depth={0} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}
