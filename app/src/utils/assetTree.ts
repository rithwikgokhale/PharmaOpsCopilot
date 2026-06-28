import { useMemo } from "react";
import type { Asset, Area, Equipment } from "../types/domain";

export interface TreeNode {
  id: string;
  label: string;
  type: "site" | "area" | "asset" | "equipment";
  children: TreeNode[];
}

export function buildAssetTree(
  siteName: string,
  areas: Area[],
  assets: Asset[],
  equipment: Equipment[]
): TreeNode {
  const root: TreeNode = {
    id: "site-root",
    label: siteName,
    type: "site",
    children: [],
  };

  for (const area of areas) {
    const areaNode: TreeNode = {
      id: area.id,
      label: area.name,
      type: "area",
      children: [],
    };

    const areaAssets = assets.filter((a) => a.areaId === area.id && !a.parentAssetId);
    for (const asset of areaAssets) {
      areaNode.children.push(buildAssetNode(asset, assets, equipment));
    }

    const childAssets = assets.filter(
      (a) => a.areaId === area.id && a.parentAssetId
    );
    for (const asset of childAssets) {
      const parent = areaNode.children.find((n) => n.id === asset.parentAssetId);
      if (parent) {
        parent.children.push(buildAssetNode(asset, assets, equipment));
      }
    }

    root.children.push(areaNode);
  }

  return root;
}

function buildAssetNode(
  asset: Asset,
  allAssets: Asset[],
  equipment: Equipment[]
): TreeNode {
  const node: TreeNode = {
    id: asset.id,
    label: asset.name,
    type: "asset",
    children: [],
  };

  const childAssets = allAssets.filter((a) => a.parentAssetId === asset.id);
  for (const child of childAssets) {
    node.children.push(buildAssetNode(child, allAssets, equipment));
  }

  const equip = equipment.filter((e) => e.assetId === asset.id);
  for (const e of equip) {
    node.children.push({
      id: e.id,
      label: `${e.tag} — ${e.name}`,
      type: "equipment",
      children: [],
    });
  }

  return node;
}

export function useAssetTree(
  siteName: string,
  areas: Area[],
  assets: Asset[],
  equipment: Equipment[]
) {
  return useMemo(
    () => buildAssetTree(siteName, areas, assets, equipment),
    [siteName, areas, assets, equipment]
  );
}
