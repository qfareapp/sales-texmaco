import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

const initialForm = {
  directoryPath: "",
  outputDirectory: "",
};

export default function TenderAnalysisPage() {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [folderFiles, setFolderFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const payload = new FormData();
    if (form.directoryPath.trim()) payload.append("directoryPath", form.directoryPath.trim());
    if (form.outputDirectory.trim()) payload.append("outputDirectory", form.outputDirectory.trim());
    Array.from(files).forEach((file) => {
      payload.append("files", file);
      payload.append("fileRelativePaths", file.name || "");
    });
    Array.from(folderFiles).forEach((file) => {
      payload.append("files", file);
      payload.append("fileRelativePaths", file.webkitRelativePath || file.name || "");
    });

    try {
      await api.post("/tender-jobs", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage("Tender analysis job started.");
      setForm(initialForm);
      setFiles([]);
      setFolderFiles([]);
      const fileInput = document.getElementById("tender-files-input");
      const folderInput = document.getElementById("tender-folder-input");
      if (fileInput) fileInput.value = "";
      if (folderInput) folderInput.value = "";
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          err.message ||
          "Failed to start tender analysis."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="mb-1">Analyse a Tender</h2>
        <p className="text-muted mb-0">
          Upload tender files or point to a local folder, then run analysis through the common backend.
        </p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h5 className="mb-3">New Tender Analysis</h5>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Upload Tender Files</label>
                <input
                  id="tender-files-input"
                  type="file"
                  className="form-control"
                  multiple
                  onChange={(event) => setFiles(event.target.files || [])}
                />
                <div className="form-text">Use file upload for the usual web workflow.</div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Upload Tender Folder</label>
                <input
                  id="tender-folder-input"
                  type="file"
                  className="form-control"
                  multiple
                  webkitdirectory=""
                  directory=""
                  onChange={(event) => setFolderFiles(event.target.files || [])}
                />
                <div className="form-text">
                  Select a full folder to include all files from nested subfolders in one upload.
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Existing Local Folder</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.directoryPath}
                  onChange={(event) => setForm((prev) => ({ ...prev, directoryPath: event.target.value }))}
                  placeholder="Optional absolute or workspace-relative folder path"
                />
              </div>
              <div className="col-md-12">
                <label className="form-label">Output Folder</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.outputDirectory}
                  onChange={(event) => setForm((prev) => ({ ...prev, outputDirectory: event.target.value }))}
                  placeholder="Optional custom output folder"
                />
              </div>
            </div>

            {message && <div className="alert alert-success py-2 mt-3 mb-0">{message}</div>}
            {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}
            {message && (
              <div className="mt-3">
                <Link to="/tender" className="btn btn-outline-secondary">
                  View Tender Dashboard
                </Link>
              </div>
            )}

            <div className="mt-3">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Starting..." : "Start Tender Analysis"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
