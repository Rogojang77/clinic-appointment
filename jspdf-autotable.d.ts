// src/types/jspdf-autotable.d.ts
import { jsPDF } from "jspdf";

declare module "jspdf-autotable" {
  function autoTable(doc: jsPDF, options: any): jsPDF;
  export default autoTable;
}
