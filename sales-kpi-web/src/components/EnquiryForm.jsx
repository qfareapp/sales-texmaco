import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import api from "../api";
import "react-datepicker/dist/react-datepicker.css";

const EnquiryFormScreen = () => {
  // ✅ Cleaned state (camelCase keys only)
  const [form, setForm] = useState({
    enquiryDate: null,
    stage: "",
    owner: "",
    source: "",
    clientType: "",
    clientName: "",
    product: "",
    wagonType: "",
    noOfRakes: "",
    wagonsPerRake: "",
    estPricePerWagon: "",
    pricePerWagon: "",
    estimatedAmount: "",
    deliveryStart: "",
    deliveryEnd: "",
    quotedPrice: "",
    remark: "",
    attachment: []
  });

  const [wagonOptions, setWagonOptions] = useState([]);

  // ✅ Label map
  const labels = {
    enquiryDate: "Enquiry Date",
    stage: "Stage",
    owner: "Owner",
    source: "Source",
    clientType: "Client Type",
    clientName: "Client Name",
    product: "Product",
    wagonType: "Wagon Type",
    noOfRakes: "No Of Rakes",
    wagonsPerRake: "No of Wagons in each Rake",
    estPricePerWagon: "Est. Price per Wagon",
    pricePerWagon: "Price per Wagon",
    estimatedAmount: "Estimated Amount",
    deliveryStart: "Delivery Date (Start)",
    deliveryEnd: "Delivery Date (End)",
    quotedPrice: "Quoted Price",
    remark: "Remark",
    attachment: "Attachment"
  };

  // ✅ Fetch wagon types
  useEffect(() => {
    api
      .get("/wagons")
      .then((res) => {
        const types = res.data.map((w) => w.wagonType);
        setWagonOptions(types);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch wagon types:", err);
      });
  }, []);

  // ✅ Handle input changes
  const handleChange = (key, value) => {
    const updated = { ...form, [key]: value };

    const rakes = parseFloat(updated.noOfRakes) || 0;
    const wagons = parseFloat(updated.wagonsPerRake) || 0;
    const unitQuoted = parseFloat(updated.pricePerWagon) || 0;
    const unitEst = parseFloat(updated.estPricePerWagon) || 0;

    if (updated.stage === "Quoted") {
      updated.quotedPrice = (unitQuoted * rakes * wagons).toFixed(2);
    }

    if (updated.stage === "Enquiry") {
      updated.estimatedAmount = (unitEst * rakes * wagons).toFixed(2);
    }

    setForm(updated);
  };

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        enquiryDate: form.enquiryDate
          ? form.enquiryDate.toISOString().split("T")[0]
          : "",
        stage: form.stage,
        owner: form.owner,
        source: form.source,
        clientType: form.clientType,
        clientName: form.clientName,
        product: form.product,
        wagonType: form.wagonType,
        noOfRakes: form.noOfRakes,
        wagonsPerRake: form.wagonsPerRake,
        estPricePerWagon: form.estPricePerWagon,
        pricePerWagon: form.pricePerWagon,
        estimatedAmount: form.estimatedAmount,
        deliveryStart: form.deliveryStart,
        deliveryEnd: form.deliveryEnd,
        quotedPrice: form.quotedPrice,
        remark: form.remark,
        attachment: form.attachment
      };

      const res = await api.post("/enquiries", payload);
      alert(`✅ Enquiry submitted! Order ID: ${res.data.orderId}`);

      setForm({
        enquiryDate: null,
        stage: "",
        owner: "",
        source: "",
        clientType: "",
        clientName: "",
        product: "",
        wagonType: "",
        noOfRakes: "",
        wagonsPerRake: "",
        estPricePerWagon: "",
        pricePerWagon: "",
        estimatedAmount: "",
        deliveryStart: "",
        deliveryEnd: "",
        quotedPrice: "",
        remark: "",
        attachment: []
      });
    } catch (err) {
      console.error("Submission Error:", err.response || err.message);
      alert("❌ Error submitting enquiry");
    }
  };

  // ✅ Fields order
  const fields = [
    "enquiryDate",
    "stage",
    "owner",
    "source",
    "clientType",
    "clientName",
    "product",
    "wagonType",
    "noOfRakes",
    "wagonsPerRake",
    "estPricePerWagon",
    "pricePerWagon",
    "estimatedAmount",
    "deliveryStart",
    "deliveryEnd",
    "quotedPrice",
    "remark",
    "attachment"
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "100vh",
        backgroundColor: "#f2f6fc",
        padding: "40px 0"
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          padding: 30,
          borderRadius: 12,
          boxShadow: "0 0 12px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 650
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 24, color: "#2c3e50" }}>
          🚆 Sales Enquiry Form
        </h2>

        {fields.map((key) => {
          // hide certain fields conditionally
          if (
            ["pricePerWagon", "deliveryStart", "deliveryEnd", "quotedPrice"].includes(
              key
            ) &&
            form.stage !== "Quoted"
          )
            return null;
          if (
            ["estPricePerWagon", "estimatedAmount"].includes(key) &&
            form.stage !== "Enquiry"
          )
            return null;

          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: "bold", color: "#34495e" }}>
                {labels[key]}
              </label>
              <br />

              {/* Date fields */}
              {key === "enquiryDate" ? (
                <DatePicker
                  selected={form.enquiryDate}
                  onChange={(date) => handleChange("enquiryDate", date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select a date"
                  className="form-control"
                />
              ) : ["deliveryStart", "deliveryEnd"].includes(key) ? (
                <input
                  type="date"
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="form-control"
                />
              ) : key === "clientType" ? (
                <select
                  value={form.clientType}
                  onChange={(e) => handleChange("clientType", e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Select --</option>
                  <option>Indian Railways</option>
                  <option>Private</option>
                  <option>Export</option>
                </select>
              ) : key === "stage" ? (
                <select
                  value={form.stage}
                  onChange={(e) => handleChange("stage", e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Select --</option>
                  <option>Enquiry</option>
                  <option>Quoted</option>
                  <option>Cancelled</option>
                  <option>Confirmed</option>
                  <option>Lost</option>
                </select>
              ) : key === "owner" ? (
                <select
                  value={form.owner}
                  onChange={(e) => handleChange("owner", e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Select --</option>
                  <option>TWRL</option>
                  <option>TREL</option>
                </select>
              ) : key === "wagonType" ? (
                <select
                  value={form.wagonType}
                  onChange={(e) => handleChange("wagonType", e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Select Wagon Type --</option>
                  {wagonOptions.map((type, i) => (
                    <option key={i} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              ) : key === "attachment" ? (
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    handleChange("attachment", Array.from(e.target.files))
                  }
                  className="form-control"
                />
              ) : (
                <input
                  type="text"
                  value={form[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  disabled={["estimatedAmount", "quotedPrice"].includes(key)}
                  className="form-control"
                />
              )}
            </div>
          );
        })}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            cursor: "pointer",
            marginTop: 10
          }}
        >
          📩 Submit Enquiry
        </button>
      </form>
    </div>
  );
};

export default EnquiryFormScreen;
