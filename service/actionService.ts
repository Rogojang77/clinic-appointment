import { generatePDF } from "@/utils/pdfUtils";

  // handle Download function
  const handleDownloadPDF = (data:any, location:string, selectDay: any, selectedDate:any, textareaContent:any) => {
    generatePDF({
      data,
      location,
      day: selectDay,
      date: selectedDate?.format("D MMMM YYYY"),
      notes: textareaContent,
    });
  };

    const TestTypeSelectedRefresh = (testType: string | null) => {
      if (testType) {
        localStorage.setItem("selectedTestType", testType);
      } else {
        localStorage.removeItem("selectedTestType");
      }
    };

export {
    handleDownloadPDF,
    TestTypeSelectedRefresh
}