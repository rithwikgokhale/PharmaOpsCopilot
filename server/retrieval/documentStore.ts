import { getData } from "../data/localDataAccess";

export interface DocSectionRecord {
  sectionId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  title: string;
  content: string;
  relatedBatchId?: string;
  relatedEquipmentIds?: string[];
  tags: string[];
}

let flattened: DocSectionRecord[] | null = null;

export function getDocSections(): DocSectionRecord[] {
  if (flattened) return flattened;
  const { documents } = getData();
  flattened = documents.flatMap((doc) =>
    doc.sections.map((section) => ({
      sectionId: section.id,
      documentId: doc.id,
      documentTitle: doc.title,
      documentType: doc.documentType,
      title: section.title,
      content: section.content,
      relatedBatchId: doc.relatedBatchId,
      relatedEquipmentIds: doc.relatedEquipmentIds ?? undefined,
      tags: doc.tags,
    }))
  );
  return flattened;
}

export function getSectionById(sectionId: string): DocSectionRecord | undefined {
  return getDocSections().find((s) => s.sectionId === sectionId);
}
