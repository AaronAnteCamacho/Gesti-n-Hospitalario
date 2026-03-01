import React from "react";
import Modal from "./Modal.jsx";
import "../styles/ExportPickerModal.css";
import pdfIcon from "../assets/pdf_icon.png";
import excelIcon from "../assets/excel_icon.png";


export default function ExportPickerModal({ open, onClose, onPick, title = "Descargar" }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="exportPickerGrid">
        <button
          type="button"
          className="exportPickerChoice"
          onClick={() => onPick?.("pdf")}
        >
          <img src={pdfIcon} alt="PDF" className="exportPickerImg" />
          <div className="exportPickerLabel">PDF</div>
        </button>

        <button
          type="button"
          className="exportPickerChoice"
          onClick={() => onPick?.("excel")}
        >
          <img src={excelIcon} alt="Excel" className="exportPickerImg" />
          <div className="exportPickerLabel">EXCEL</div>
        </button>
      </div>
    </Modal>
  );
}