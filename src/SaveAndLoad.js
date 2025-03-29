import React from "react";

const SaveAndLoad = ({ activities, setActivities, returnToMain }) => {
  const handleSave = () => {
    if (activities.length === 0) {
      alert("No data available to save.");
      return;
    }

    const headers = [
      "Date",
      "Start",
      "End",
      "Duration",
      "Pre/Post",
      "Activity",
      "Note", // Add note header
    ];
    const csvRows = activities.map((activity) =>
      [
        activity.date,
        activity.start,
        activity.end,
        activity.duration,
        activity.prePost || "0",
        activity.activity,
        activity.note, // Include note in CSV row
      ].join(",")
    );
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SafeHours_Activities.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoad = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").map((line) => line.trim());
      const [header, ...rows] = lines;

      const parsed = rows
        .map((row) => {
          const [date, start, end, duration, prePost, activity, note] =
            row.split(",");
          if (!date || !start || !end || !activity) return null;
          return { date, start, end, duration, prePost, activity, note }; // Include note in parsed object
        })
        .filter(Boolean);

      if (parsed.length > 0) {
        setActivities(parsed);
        returnToMain();
      } else {
        alert("CSV file is empty or invalid.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "tan",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: "20px", fontSize: "26px" }}>
        Save and Load Activities
      </h2>

      <button
        onClick={handleSave}
        style={{ ...buttonStyle, backgroundColor: "green", color: "white" }}
      >
        Save to CSV
      </button>

      <label
        style={{ ...buttonStyle, backgroundColor: "darkred", color: "white" }}
      >
        <span style={{ width: "100%", textAlign: "center" }}>
          Load from CSV
        </span>
        <input
          type="file"
          accept=".csv"
          onChange={handleLoad}
          style={{ display: "none" }}
        />
      </label>

      <button
        onClick={returnToMain}
        style={{
          ...buttonStyle,
          backgroundColor: "#f0f0f0",
          color: "black",
        }}
      >
        Main Screen
      </button>
    </div>
  );
};

const buttonStyle = {
  width: "240px",
  height: "60px",
  margin: "10px",
  fontSize: "22px", // 👈 Increased font size here
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  borderRadius: "10px",
  border: "2px solid black",
  cursor: "pointer",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export default SaveAndLoad;
