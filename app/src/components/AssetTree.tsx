import type { TreeNode } from "../utils/assetTree";

interface Props {
  tree: TreeNode;
  selectedId: string | null;
  onSelect: (id: string, type: TreeNode["type"]) => void;
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
  const typeIcon =
    node.type === "equipment"
      ? "⚙"
      : node.type === "asset"
        ? "▣"
        : node.type === "area"
          ? "◫"
          : "◎";

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id, node.type)}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition-colors ${
          isSelected
            ? "bg-brand-500 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="text-xs opacity-70">{typeIcon}</span>
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
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Asset Hierarchy
      </h3>
      <TreeItem
        node={tree}
        depth={0}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
