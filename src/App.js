import React, { useState, useEffect, useRef } from "react";
import Charts from "./Charts"; // Import Charts Component
import SaveAndLoad from "./SaveAndLoad";

function App() {
  const [showSaveScreen, setShowSaveScreen] = useState(false);

  const [activities, setActivities] = useState(() => {
    const savedData = localStorage.getItem("activities");
    return savedData ? JSON.parse(savedData) : [];
  });

  const getActivityData = () => {
    const activityMap = {};

    activities.forEach((a) => {
      const startTime = new Date(`${a.date}T${a.start}`);
      const endTime = new Date(`${a.date}T${a.end}`);
      const hours = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours

      if (!activityMap[a.activity]) {
        activityMap[a.activity] = { activity: a.activity, hours: 0 };
      }

      activityMap[a.activity].hours += hours;
    });

    return Object.values(activityMap);
  };

  const getWeeklyData = () => {
    const pastWeekStart = new Date(targetDate);
    pastWeekStart.setDate(pastWeekStart.getDate() - 6); // 7-day range

    // Initialize a map to hold summed flight & contact hours per date
    const dataMap = {};

    activities.forEach((a) => {
      const activityDate = a.date;
      if (
        new Date(activityDate) >= pastWeekStart &&
        new Date(activityDate) <= new Date(targetDate)
      ) {
        const startTime = new Date(`${a.date}T${a.start}`);
        const endTime = new Date(`${a.date}T${a.end}`);
        const hours = (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours

        if (!dataMap[activityDate]) {
          dataMap[activityDate] = {
            date: activityDate,
            flightHours: 0,
            contactHours: 0,
          };
        }

        if (a.activity === "Flight") {
          dataMap[activityDate].flightHours += hours;
        }
        if (a.activity !== "Other Sched. Act.") {
          dataMap[activityDate].contactHours += hours;
        }
      }
    });

    // Convert the map into an array sorted by date
    return Object.values(dataMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  const [showCharts, setShowCharts] = useState(false);
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0"); // Ensure two digits
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const tableContainerRef = useRef(null); // Track the scroll container
  const [scrollTop, setScrollTop] = useState(0); // Store the scroll position

  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = scrollTop;
    }
  }, [activities]); // Runs when activities update

  useEffect(() => {
    // Set activities in localStorage
    localStorage.setItem("activities", JSON.stringify(activities));

    // Set the background color of the body
    document.body.style.backgroundColor = "tan";
  }, [activities]);

  const [newActivity, setNewActivity] = useState({
    start: "",
    duration: "", // Store duration instead of end time
    activity: "Flight",
    note: "", // Add note field
  });

  const getLocalDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-CA"); // 📆 Ensures YYYY-MM-DD format
  };
  const [targetDate, setTargetDate] = useState(getLocalDate());

  const [isModalOpen, setIsModalOpen] = useState(false); // To manage modal visibility
  const [isHelpOpen, setIsHelpOpen] = useState(false); // State to control Help Modal visibility

  const getPreviousDate = (dateString) => {
    const parts = dateString.split("-"); // Ensure it's split into YYYY, MM, DD
    if (parts.length !== 3) return ""; // Prevent crashes if the format is invalid

    const newDate = new Date(parts[0], parts[1] - 1, parts[2]); // Month is 0-based
    newDate.setDate(newDate.getDate() - 1);

    return newDate.toISOString().split("T")[0]; // Ensure valid format
  };

  const downloadActivities = () => {
    if (activities.length === 0) {
      alert("No data available to download.");
      return;
    }

    // Define CSV Headers
    // Define CSV Headers
    const headers = [
      "Date",
      "Start",
      "End",
      "Duration",
      "Pre/Post",
      "Activity",
      "Note", // Add note header
    ];

    // Convert activities array to CSV format
    const csvRows = activities.map((activity) =>
      [
        activity.date,
        activity.start,
        activity.end,
        activity.duration,
        activity.prePost || "0", // Default to "0" if missing
        activity.activity,
        activity.note, // Add note to CSV row
      ].join(",")
    );

    // Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // Create a Blob and trigger the download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SafeHours_Activities.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Updated addActivity function to prevent overlapping times
  const addActivity = () => {
    // Check if all fields are filled
    if (
      !newActivity.date ||
      !newActivity.start ||
      !newActivity.duration ||
      !newActivity.activity
    ) {
      alert("Please fill out all fields.");
      return;
    }

    // Convert start time to a Date object
    const startTime = new Date(`${newActivity.date}T${newActivity.start}`);

    // Convert duration (in hours) to milliseconds
    const durationInMs = parseFloat(newActivity.duration) * 60 * 60 * 1000;

    // Calculate the end time
    const endTime = new Date(startTime.getTime() + durationInMs);

    // Check for overlapping activities
    const isOverlapping = activities.some((activity) => {
      if (activity.date !== newActivity.date) return false; // Only check activities on the same date

      const existingStart = new Date(`${activity.date}T${activity.start}`);
      const existingEnd = new Date(`${activity.date}T${activity.end}`);

      // Check if the new activity overlaps an existing one
      return !(endTime <= existingStart || startTime >= existingEnd);
    });

    if (isOverlapping) {
      alert(
        "Time conflict detected! The selected timeframe overlaps with an existing activity."
      );
      return; // Prevent adding the new activity
    }

    // Format endTime as HH:MM
    const endHours = endTime.getHours().toString().padStart(2, "0");
    const endMinutes = endTime.getMinutes().toString().padStart(2, "0");
    const formattedEndTime = `${endHours}:${endMinutes}`;

    // Create new activity object with calculated end time
    const newActivityWithEndTime = {
      ...newActivity,
      end: formattedEndTime, // Store computed end time
      prePost:
        newActivity.activity === "Flight" || newActivity.activity === "SIM/ATD"
          ? newActivity.prePost || "0"
          : "0", // Only store Pre&Post if applicable
      note: newActivity.note, // Include note
    };
    // Sort and update activities
    const updatedActivities = [...activities, newActivityWithEndTime].sort(
      (a, b) => {
        const dateA = new Date(a.date + "T" + a.start);
        const dateB = new Date(b.date + "T" + b.start);
        return dateB - dateA;
      }
    );

    setActivities(updatedActivities);
    setIsModalOpen(false);
  };

  const deleteActivity = (index) => {
    const updatedActivities = activities.filter((_, i) => i !== index);
    setActivities(updatedActivities);
  };

  const calculatePast7DaysHours = () => {
    const target = new Date(targetDate);
    const pastWeekStart = new Date(target);
    pastWeekStart.setDate(target.getDate() - 6); // Get the date 6 days before target (7-day range)

    // Group activities by date and sum their contact hours
    const dailyHours = activities.reduce((acc, a) => {
      const activityDate = new Date(a.date);

      // Only include activities within the past 7 days and not "Other Sched. Act."
      if (
        activityDate >= pastWeekStart &&
        activityDate <= target &&
        a.activity !== "Other Sched. Act."
      ) {
        const startTime = new Date(`${a.date}T${a.start}`);
        const endTime = new Date(`${a.date}T${a.end}`);
        const hours = (endTime - startTime) / (1000 * 60 * 60); // Convert milliseconds to hours

        acc[a.date] = (acc[a.date] || 0) + hours; // Sum hours per date
      }
      return acc;
    }, {});

    // Only sum days that had Contact Time (non-zero values)
    return Object.values(dailyHours).reduce((sum, hours) => sum + hours, 0);
  };

  const calculateFlightHours = () => {
    return activities
      .filter((a) => a.date === targetDate && a.activity === "Flight")
      .map((a) => {
        const startTime = new Date(`${a.date}T${a.start}`);
        const endTime = new Date(`${a.date}T${a.end}`);
        return (endTime - startTime) / (1000 * 60 * 60);
      })
      .reduce((sum, hours) => sum + hours, 0);
  };

  const calculateConsecutiveDays = () => {
    let count = 0;
    let currentDate = targetDate;

    while (
      activities.some(
        (a) => a.date === currentDate && a.activity !== "Other Sched. Act." // 🔹 Only count days with Contact Time
      )
    ) {
      count++;
      const prevDate = getPreviousDate(currentDate);

      // Stop if the previous day has no valid contact time
      if (
        !activities.some(
          (a) => a.date === prevDate && a.activity !== "Other Sched. Act." // 🔹 Skip days with only "Other Sched. Act."
        )
      ) {
        break;
      }

      currentDate = prevDate;
    }

    return count; // No rounding needed, count is already whole
  };

  const calculateContactHours = () => {
    return activities
      .filter(
        (a) => a.date === targetDate && a.activity !== "Other Sched. Act."
      ) // 🔹 Exclude "Other Sched. Act."
      .map((a) => {
        const startTime = new Date(`${a.date}T${a.start}`);
        const endTime = new Date(`${a.date}T${a.end}`);
        const duration = (endTime - startTime) / (1000 * 60 * 60); // Convert milliseconds to hours

        // Add Pre&Post time if it exists
        const prePostTime = parseFloat(a.prePost) || 0;
        return duration + prePostTime;
      })
      .reduce((sum, hours) => sum + hours, 0);
  };

  const past7DaysHours = calculatePast7DaysHours();
  // Calculate duty Day
  const calculateDutyDay = () => {
    const targetActivities = activities.filter((a) => a.date === targetDate);
    if (targetActivities.length === 0) return 0; // If no activities, return 0

    // Sort activities by start time
    const sortedActivities = [...targetActivities].sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    // Find the earliest start time
    const firstStartTime = new Date(
      `${targetDate}T${sortedActivities[0].start}`
    );

    // Find the latest end time
    const lastEndTime = new Date(
      `${targetDate}T${sortedActivities[sortedActivities.length - 1].end}`
    );

    // Convert milliseconds to hours with precision
    const dutyHours = (lastEndTime - firstStartTime) / (1000 * 60 * 60);

    return Math.max(0, dutyHours.toFixed(2)); // ✅ Keep decimals, show up to 2 places
  };

  const calculateRestHours = () => {
    if (!targetDate) return 0; // Prevents error if targetDate is undefined

    const previousDate = getPreviousDate(targetDate);
    if (!previousDate) return 0; // Prevents further errors if previousDate is invalid

    // Find activities on the previous date
    const previousActivities = activities.filter(
      (a) => a.date === previousDate
    );

    // Find activities on the target date
    const targetActivities = activities.filter((a) => a.date === targetDate);

    if (previousActivities.length === 0 || targetActivities.length === 0) {
      return 0; // No valid rest period if no activities exist
    }

    // Find the latest end time from the previous date
    const lastEndTime = new Date(
      `${previousDate}T${previousActivities.reduce(
        (latest, activity) => (latest > activity.end ? latest : activity.end),
        "00:00"
      )}`
    );

    // Find the earliest start time from the target date
    const firstStartTime = new Date(
      `${targetDate}T${targetActivities.reduce(
        (earliest, activity) =>
          earliest < activity.start ? earliest : activity.start,
        "23:59"
      )}`
    );

    // Calculate Rest Hours and prevent negative values
    const restHours = (firstStartTime - lastEndTime) / (1000 * 60 * 60);

    return Math.max(0, Math.round(restHours)); // Prevent negatives & round to whole number
  };

  const flightHours = calculateFlightHours();
  const consecutiveDays = calculateConsecutiveDays();
  const contactHours = calculateContactHours();
  const dutyDay = calculateDutyDay();
  const restHours = calculateRestHours();

  // Format hours to two decimal places
  const formatHours = (hours) => {
    return hours.toFixed(2);
  };

  // Warning checks

  const flightHoursWarning = flightHours > 8;
  const consecutiveDaysWarning = consecutiveDays > 15;
  const contactHoursWarning = contactHours > 10;
  const dutyDayWarning = dutyDay > 16;
  const restHoursWarning = restHours <= 0 ? false : restHours < 10;
  const past7DaysWarning = past7DaysHours > 50; // Example threshold of 50 hours
  const getBoxStyle = (type, value) => {
    let backgroundColor = "grey"; // Default color

    if (type === "flight") {
      if (value > 8) {
        backgroundColor = "#8B0000"; // Dark Red if over 8
      } else if (value > 6 && value <= 8) {
        backgroundColor = "#B8860B"; // Burnt Gold if between 6 and 8
      }
    } else if (type === "contact") {
      if (value >= 10) {
        backgroundColor = "#8B0000"; // Dark Red if 10 or more
      } else if (value > 8 && value < 10) {
        backgroundColor = "#B8860B"; // Burnt Gold if greater than 8 but less than 10
      }
    } else if (type === "consecutive") {
      if (value > 15) {
        backgroundColor = "#8B0000"; // Dark Red for more than 15 consecutive days
      } else if (value === 15) {
        backgroundColor = "#B8860B"; // Burnt Gold (dark yellow) when exactly 15 days
      }
    } else if (type === "duty") {
      if (value > 16) {
        backgroundColor = "#8B0000"; // Dark Red if over 16
      } else if (value > 14 && value <= 16) {
        backgroundColor = "#B8860B"; // Burnt Gold if between 14 and 16
      }
    } else if (type === "past7days") {
      if (value > 50) {
        backgroundColor = "#8B0000"; // Dark Red if more than 50 hours
      } else if (value >= 48) {
        backgroundColor = "#B8860B"; // Burnt Gold if exactly 48 to 50 hours
      }
    }

    return {
      backgroundColor,
      color: "white",
      padding: "12px 16px",
      border: "none",
      cursor: "pointer",
      borderRadius: "10px",
      fontSize: "12px",
      fontWeight: "bold",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center", // ✅ NEW: vertically center content
      textAlign: "center", // ✅ NEW: center-align text
      minWidth: "120px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    };
  };
  const handleShowNote = (note) => {
    alert(note); // Display the note in an alert for simplicity
  };
  const handleEditActivity = (index, field, value) => {
    const updatedActivities = [...activities];
    let activity = { ...updatedActivities[index], [field]: value };

    if (field === "start" || field === "end") {
      let [hours, minutes] = value.split(":");
      hours = hours.padStart(2, "0");
      activity[field] = `${hours}:${minutes}`;

      const { start, end, date } = activity;

      // Only check midnight logic when both start and end are filled
      if (start && end) {
        const startTime = new Date(`${date}T${start}:00`);
        const endTime = new Date(`${date}T${end}:00`);

        const localStartDate = new Date(
          startTime.getTime() - startTime.getTimezoneOffset() * 60000
        )
          .toISOString()
          .split("T")[0];

        const localEndDate = new Date(
          endTime.getTime() - endTime.getTimezoneOffset() * 60000
        )
          .toISOString()
          .split("T")[0];

        if (localStartDate !== localEndDate) {
          alert("End time cannot extend past midnight.");
          return;
        }

        const newDuration = (endTime - startTime) / (1000 * 60 * 60);
        if (newDuration < 0) {
          alert("End time must be after start time.");
          return;
        }

        activity.duration = newDuration.toFixed(1);
      }
    }

    updatedActivities[index] = activity;
    setActivities(updatedActivities);
  };

  const formatLocalDate = (dateString) => {
    const date = new Date(dateString + "T12:00:00"); // Force midday to avoid UTC offset issues
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  };
  const formatTime24 = (timeString) => {
    if (!timeString) return "--:--"; // Handles empty values
    const [hours, minutes] = timeString.split(":");
    return `${hours.padStart(2, "0")}:${minutes}`; // Ensures "HH:mm" format
  };
  const openModal = () => {
    setNewActivity({
      date: getLocalDate(), // ✅ Use today's date
      start: getCurrentTime(),
      duration: "",
      prePost: "0",
      activity: "Flight",
    });
    setIsModalOpen(true);
  };

  if (showSaveScreen) {
    return (
      <SaveAndLoad
        activities={activities}
        setActivities={setActivities}
        returnToMain={() => setShowSaveScreen(false)}
      />
    );
  }
  return (
    <div
      style={{
        height: "100vh", // Full height of the screen
        width: "100vw", // Full width of the screen
        display: "flex",
        flexDirection: "column",
        backgroundColor: "tan",
        overflow: "hidden", // Prevents unwanted scrolling
      }}
    >
      <div
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          backgroundColor: "tan",
          padding: "3px",
          zIndex: "1000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0px 2px 5px rgba(0,0,0,0.2)", // Optional shadow effect
        }}
      >
        <h1 style={{ margin: "0", fontSize: "24px" }}>
          SafeHours Version 3.28.21:00{" "}
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column", // Stack elements vertically
            alignItems: "center",
            marginTop: "5px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "px" }}>
            <div
              onClick={() => setIsModalOpen(true)}
              style={{
                backgroundColor: "#f0f0f0",
                color: "black",
                fontWeight: "bold",
                fontSize: "32px",
                marginRight: "4px", // 👈 Adds a little space to the right
                width: "50px",
                height: "50px",
                borderRadius: "50%", // Fully round
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                //border: "2px solid black",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)", // ✅ Base shadow
                transition: "box-shadow 0.2s ease, transform 0.2s ease", // ✅ Smooth animation
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 6px 12px rgba(0, 0, 0, 0.35)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 8px rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              +
            </div>
            <div
              onClick={() => setShowCharts(!showCharts)} // Toggles chart visibility
              style={{
                backgroundColor: "#f0f0f0",
                color: "black",
                fontWeight: "bold",
                fontSize: "24px",
                marginRight: "4px", // 👈 Adds a little space to the right
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                //border: "2px solid black",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)", // ✅ Base shadow
                transition: "box-shadow 0.2s ease, transform 0.2s ease", // Smooth hover
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 6px 12px rgba(0, 0, 0, 0.35)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 8px rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              📊
            </div>

            <input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              style={{
                fontSize: "22px",
                padding: "10px",
                width: "100px",
                //border: "2px solid black", // ✅ Black border
                borderRadius: "6px", // Optional: Rounded edges
                marginRight: "4px", // 👈 Adds a little space to the right
                backgroundColor: "white", // Optional: Ensure visibility
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)", // ✅ Subtle shadow
                transition: "box-shadow 0.2s ease-in-out", // Smooth on hover
              }}
            />
            <div
              onClick={() => setIsHelpOpen(true)}
              style={{
                backgroundColor: "#f0f0f0",
                color: "black",
                fontWeight: "bold",
                fontSize: "32px",
                marginRight: "4px", // 👈 Adds a little space to the right
                width: "50px",
                height: "50px",
                borderRadius: "50%", // Fully round
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)", // Base shadow
                transition: "box-shadow 0.2s ease, transform 0.2s ease", // Smooth hover + lift
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 6px 12px rgba(0, 0, 0, 0.35)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 8px rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ?
            </div>

            {/* Download Button */}
            <div
              onClick={() => setShowSaveScreen(true)}
              style={{
                backgroundColor: "#f0f0f0",
                color: "black",
                fontWeight: "bold",
                fontSize: "24px",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)", // Base shadow
                transition: "box-shadow 0.2s ease, transform 0.2s ease", // Smooth hover + lift
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 6px 12px rgba(0, 0, 0, 0.35)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 8px rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              💾
            </div>
          </div>

          {/* Target Date Label (Centered Below Input) */}
          <div
            style={{ marginTop: "0px", fontWeight: "bold", fontSize: "20px" }}
          >
            Target Date
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          onClick={() => setIsModalOpen(true)} // Open modal on click
          style={{
            backgroundColor: "#f0f0f0",
            color: "black",
            fontWeight: "bold",
            fontSize: "32px",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "10px",
            cursor: "pointer",
          }}
        >
          +
        </div>
        <input
          id="target-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          style={{ fontSize: "22px", padding: "10px", width: "250px" }}
        />
        <div
          onClick={() => setIsHelpOpen(true)} // Ensure this updates state
          style={{
            backgroundColor: "#f0f0f0",
            color: "black",
            fontWeight: "bold",
            fontSize: "32px",
            width: "50px",
            height: "50px",

            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: "10px",
            cursor: "pointer",
          }}
        >
          ?
        </div>
      </div>
      {/* Modal for Add Activity */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            zIndex: "1000",
            maxWidth: "600px",
            width: "90%",
          }}
        >
          <h3
            style={{
              textAlign: "center",
              marginBottom: "1px",
              fontSize: "26px",
            }}
          >
            Add New Activity
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "15px", // ⬅️ Increased spacing below the Date field
            }}
          >
            <label
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginBottom: "5px",
                textAlign: "center",
                color: "#555",
              }}
            >
              Date
            </label>
            <input
              type="date"
              value={newActivity.date}
              onChange={(e) =>
                setNewActivity({ ...newActivity, date: e.target.value })
              }
              style={{
                fontSize: "22px",
                padding: "12px",
                width: "50%", // Adjust width as needed
                textAlign: "center",
                display: "block",
                marginBottom: "20px",
                color: "#555",
                border: "2px solid black",
                borderRadius: "10px",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              width: "100%",
            }}
          >
            {/* Start Time Section */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                marginLeft: "20px",
              }}
            >
              <div
                style={{ fontSize: "14px", color: "#555", textAlign: "center" }}
              >
                Select Start Time
              </div>
              <input
                type="time"
                value={newActivity.start}
                onChange={(e) =>
                  setNewActivity({ ...newActivity, start: e.target.value })
                }
                style={{
                  fontSize: "22px",
                  padding: "10px",
                  width: "80px",
                  marginLeft: "px",
                  height: "50px", // 🔹
                  textAlign: "center",
                  backgroundColor: "#D3D3D3",
                  border: "2px solid black",
                  borderRadius: "10px",
                }}
              />
            </div>

            {/* Duration Section */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              <div
                style={{ fontSize: "14px", color: "#555", textAlign: "center" }}
              >
                Enter Duration
              </div>
              <input
                type="number"
                value={newActivity.duration}
                onChange={(e) =>
                  setNewActivity({ ...newActivity, duration: e.target.value })
                }
                placeholder="(Ex: 2.1)"
                step="0.1"
                min="0"
                style={{
                  fontSize: "22px",
                  padding: "10px",
                  width: "80px",
                  marginLeft: "px",
                  textAlign: "center",
                  height: "30px", // 🔹 Same height as the time input
                  backgroundColor: "#D3D3D3",
                  border: "2px solid black",
                  borderRadius: "10px",
                }}
              />
            </div>

            {/* Conditionally Show Pre&Post Input Only for Flight or Sim/ATD */}
            {(newActivity.activity === "Flight" ||
              newActivity.activity === "SIM/ATD") && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#555",
                    textAlign: "center",
                  }}
                >
                  Enter Pre&Post
                </div>
                <input
                  type="text"
                  value={newActivity.prePost || "0"} // ✅ Use newActivity instead
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, prePost: e.target.value })
                  }
                  inputMode="decimal" // ✅ Enables decimal keyboard on iPhone
                  pattern="[0-9]*[.,]?[0-9]*"
                  placeholder="(Ex: 2.1)"
                  step="0.1"
                  min="0.0"
                  style={{
                    color: "Black", // ✅ Fixed: lowercase 'c'
                    fontSize: "22px",
                    padding: "10px",
                    width: "80px",
                    textAlign: "center",
                    height: "30px", // 🔹 Same height as the time input
                    backgroundColor: "#D3D3D3", // Light gray background
                    borderRadius: "10px", // Rounded corners
                    border: "2px solid black",
                    borderRadius: "10px",
                  }}
                />
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "15px",
            }}
          >
            <div
              style={{ fontSize: "14px", color: "#555", marginBottom: "5px" }}
            >
              Add Note
            </div>
            <textarea
              value={newActivity.note}
              onChange={(e) =>
                setNewActivity({ ...newActivity, note: e.target.value })
              }
              style={{
                fontSize: "16px",
                padding: "10px",
                width: "80%",
                height: "60px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                resize: "none",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "15px",
            }}
          >
            <div
              style={{ fontSize: "14px", color: "#555", marginBottom: "5px" }}
            >
              Select Activity
            </div>
            <select
              value={newActivity.activity}
              onChange={(e) =>
                setNewActivity({ ...newActivity, activity: e.target.value })
              }
              style={{
                fontSize: "22px",
                padding: "10px",
                width: "200px", // Fixed width to maintain consistency
                textAlign: "center",
                borderRadius: "5px",
                border: "1px solid #ccc",
                backgroundColor: "#D3D3D3",
                border: "2px solid black",
                borderRadius: "10px",
              }}
            >
              <option value="Flight">Flight</option>
              <option value="SIM/ATD">SIM/ATD</option>
              <option value="Ground">Ground</option>
              <option value="Other Sched. Act.">Other Sched. Act.</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "15px",
            }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                backgroundColor: "#8B0000", // DarkRed
                color: "white",
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                border: "2px solid black",
                borderRadius: "10px",
              }}
            >
              Close
            </button>
            <button
              onClick={addActivity}
              style={{
                backgroundColor: "#006400", // Darkgreen
                color: "white",
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                border: "2px solid black",
                borderRadius: "10px",
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
      {isHelpOpen && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: "20px 30px",
            borderRadius: "12px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            zIndex: "1000",
            maxWidth: "600px",
            width: "90%",
          }}
        >
          <h3
            style={{
              textAlign: "center",
              marginBottom: "20px",
              fontSize: "26px",
            }}
          >
            Overview
          </h3>

          <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
            <h4>**SafeHours – Flight & Duty Tracking for CFIs**</h4>
            <p>
              <strong>SafeHours</strong> is a tracking tool designed for{" "}
              <strong>Certified Flight Instructors (CFIs)</strong> to
              efficiently monitor their work hours and ensure compliance with{" "}
              <strong>FAA regulations and SP&P policies</strong>.
            </p>

            <ul>
              <li>
                <strong>Log Activities</strong> – Track{" "}
                <em>
                  flight instruction, simulator (SIM/ATD) sessions, ground
                  instruction, and other scheduled activities
                </em>
                .
              </li>
              <li>
                <strong>Automated Calculations</strong> – Computes{" "}
                <em>daily, weekly, and consecutive duty hours</em>.
              </li>
              <li>
                <strong>Regulatory Compliance</strong> – Helps CFIs stay within{" "}
                <strong>FAA and SP&P limits</strong> for:
                <ul>
                  <li>Flight hours (Max per 24 hours)</li>
                  <li>Contact time (Total instructional time per day)</li>
                  <li>Duty periods (Max consecutive hours worked)</li>
                  <li>Required rest (Ensures minimum break time)</li>
                </ul>
              </li>
              <li>
                <strong>Visual Tracking</strong> – Generates <em>charts</em> to
                display flight and duty hour trends.
              </li>
              <li>
                <strong>Warning Alerts</strong> – Notifies CFIs when approaching
                or exceeding regulatory limits.
              </li>
              <li>
                <strong>Local Data Storage</strong> – Saves records directly on
                the device for easy access.
              </li>
            </ul>

            {/* Disclaimer Section */}
            <div
              style={{
                marginTop: "15px",
                padding: "10px",
                backgroundColor: "#FFF3CD", // Light yellow background
                color: "#856404", // Dark warning text
                border: "1px solid #FFD700", // Gold border
                borderRadius: "8px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              ⚠️ <strong>Disclaimer:</strong> SafeHours is an informational tool
              only. Users are responsible for ensuring compliance with FAA
              regulations and official record-keeping requirements.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() => setIsHelpOpen(false)}
              style={{
                backgroundColor: "#8B0000",
                color: "white",
                padding: "10px 20px",
                border: "none",
                cursor: "pointer",
                borderRadius: "5px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Container for scrollable table */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh", // Make the parent container take the full height
        }}
      >
        {/* Main Content */}

        {showCharts && (
          <Charts
            weeklyData={getWeeklyData()}
            activityData={getActivityData()}
            timelineData={activities.filter((a) => a.date === targetDate)} // Send only today's activities
          />
        )}
        <div
          style={{
            width: "100%",
            maxWidth: "99.9vw", // ⬅️ Limits table width to 95% of the screen (adjust if needed)
            margin: "0 auto", // ⬅️ Centers the table with spacing
            overflowX: "auto",
            boxSizing: "border-box",
            fontSize: "12px",
            display: "flex",
            paddingTop: "100px",
            paddingRight: "2vw", // ⬅️ Adds padding on the right to stop it from hitting the screen edge
            justifyContent: "center",
          }}
        >
          <table
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
              width: "100%",
              maxWidth: "100%",
              borderCollapse: "collapse",
              fontSize: "10px",
              tableLayout: "fixed",
              minWidth: "100%",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: "0",
                textAlign: "center",
                backgroundColor: "#A9A9A9",
                height: "33px", // 🔹 Increase height slightly
              }}
            >
              <tr>
                <th style={{ width: "5%", textAlign: "center" }}>Date</th>
                <th style={{ width: "5%", textAlign: "center" }}>Start</th>
                <th style={{ width: "5%", textAlign: "center" }}>End</th>
                <th style={{ width: "3%", textAlign: "center" }}>Hrs</th>
                <th style={{ width: "5%", textAlign: "center" }}>Pre/Post</th>
                <th style={{ width: "7%", textAlign: "center" }}>Activ</th>
                <th style={{ width: "4%", textAlign: "center" }}>Note</th>
                <th style={{ width: "5%", textAlign: "center" }}>Del</th>
              </tr>
            </thead>

            <tbody>
              {activities.map((activity, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#f2f2f2" : "#D3D3D3",
                  }}
                >
                  {/* Date Column */}
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "0px",
                      textAlign: "center",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatLocalDate(activity.date)}
                  </td>

                  {/* Editable Start Time */}
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "0px",
                      textAlign: "center",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <input
                      type="time"
                      value={formatTime24(activity.start)} // ✅ Ensures 24-hour format
                      onChange={(e) =>
                        handleEditActivity(index, "start", e.target.value)
                      }
                      style={{
                        width: "30px",
                        textAlign: "center",
                        fontSize: "12px",
                        padding: "0px",
                      }}
                    />
                  </td>

                  {/* Editable End Time */}
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "0px",
                      textAlign: "center",
                      fontSize: "12px",
                    }}
                  >
                    <input
                      type="time"
                      value={formatTime24(activity.end)} // Ensures 24-hour format
                      onChange={(e) =>
                        handleEditActivity(index, "end", e.target.value)
                      }
                      style={{
                        width: "30px",
                        textAlign: "center",
                        fontSize: "12px",
                        padding: "0px",
                      }}
                    />
                  </td>

                  {/* Duration (Hrs) Column */}
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "0px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      width: "10px", // Set smaller width
                      fontSize: "12px",
                      color: "#007AFF",

                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activity.duration}
                  </td>

                  {/* Editable Pre&Post Column */}
                  <td
                    style={{
                      fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      border: "1px solid #ddd",
                      padding: "0px",
                      textAlign: "center",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <input
                      type="tel" // iPhones now allow decimals
                      value={activity.prePost || "0"} // ✅ Use activity from the .map loop
                      onChange={(e) =>
                        handleEditActivity(index, "prePost", e.target.value)
                      }
                      step="0.1" // Allows decimal values like 0.5, 1.0, etc.
                      min="0" // Prevents negative numbers
                      inputMode="decimal" // Opens numeric keypad instead of full keyboard on mobile
                      pattern="[0-9]*" // Ensures only numbers are entered
                      style={{
                        width: "30px", // Set smaller width
                        color: "#007AFF",
                        fontSize: "12px",
                        padding: "2px", // Reduce padding
                        textAlign: "center",
                        appearance: "textfield", // Removes default browser styling
                      }}
                    />
                  </td>

                  {/* Editable Activity Dropdown */}
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "0px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <select
                      value={activity.activity}
                      onChange={(e) =>
                        handleEditActivity(index, "activity", e.target.value)
                      }
                      style={{ fontSize: "10px", padding: "1px" }}
                    >
                      <option value="Flight">Flight</option>
                      <option value="SIM/ATD">SIM/ATD</option>
                      <option value="Ground">Ground</option>

                      <option value="Other Sched. Act.">
                        Other Sched. Act.
                      </option>
                    </select>
                  </td>

                  {/* Delete Button */}
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "0px",
                      textAlign: "center",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleShowNote(activity.note)}
                  >
                    📎
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "0px",
                      textAlign: "center",
                    }}
                  >
                    <button
                      onClick={() => deleteActivity(index)}
                      style={{
                        backgroundColor: "#8B0000",
                        color: "white",
                        padding: "5px 10px",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "5px",
                      }}
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Warnings Section (Positioned Fixed) */}
      {!showCharts && !isHelpOpen && (
        <div
          style={{
            position: "fixed", // Make the warning buttons fixed at the bottom
            bottom: "0", // Align to the bottom of the screen
            left: "0",
            right: "0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "#D2B48C", // Tan background color
            padding: "1px 0",
            zIndex: 1000, // Ensure they appear above the rest of the content
            boxShadow: "0 -2px 10px rgba(0,0,0,0.1)", // Optional: Add some shadow for better visibility
          }}
        >
          {/* Row 1: First 3 warning blocks */}
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <button
              style={getBoxStyle("flight", flightHours)}
              onClick={() =>
                alert(
                  "**14 CFR § 61.195(j) – Flight Instructor Limitations**\n\n(j) Limitations on flight instruction. A flight instructor may not conduct more than 8 hours of flight training in any 24-consecutive-hour period."
                )
              }
            >
              Flight Instruction
              <div>{formatHours(flightHours)} hrs</div>
            </button>

            <button
              style={getBoxStyle("contact", contactHours)}
              onClick={() =>
                alert(
                  "SP&P 2.10.7(B): No more than 10 contact hours in any 24 consecutive hour period."
                )
              }
            >
              Contact Time
              <div>{formatHours(contactHours)} hrs</div>
            </button>
            <button
              style={getBoxStyle("consecutive", consecutiveDays)}
              onClick={() =>
                alert(
                  "**SP&P 2.10.8 Duty Free Days:**\n\nNo flight instructor or crew member shall work more than 15 consecutive days without at least one day free of UNDAF employment activities."
                )
              }
            >
              Consecutive Days
              <div>
                {Math.floor(consecutiveDays) === 1
                  ? "1 day"
                  : `${Math.floor(consecutiveDays)} days`}
              </div>
            </button>
          </div>

          {/* Row 2: Last 2 warning blocks */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
              justifyContent: "center",
            }}
          >
            <button
              style={getBoxStyle("duty", dutyDay)}
              onClick={() =>
                window.confirm(
                  "**2.10.6 Duty Period involving Aircraft Activity:**\n\nEach duty period must not exceed 16 hours and must be preceded by 10 hours of uninterrupted rest that should include 6 to 8 hours of sleep.\n\nNo crew member, flight instructor, or flight student may accept, schedule, or conduct an aircraft flight-related activity that exceeds these requirements.\n\nNOTE: Individuals have a personal responsibility to ensure they are rested with sufficient sleep when scheduled for duty activity."
                )
              }
            >
              Duty Period
              <div>{formatHours(dutyDay)} hrs</div>
            </button>

            <button
              style={getBoxStyle("past7days", past7DaysHours)}
              onClick={() =>
                alert(
                  "**SP&P 2.10.7 Flight Instructors are limited to:**\n\n" +
                    "C. No more than 50 contact hours in any 7 consecutive day period.\n" +
                    " \n" +
                    "***NOTE: For the purpose of 2.9.7 (C), a day is defined as the hours between 00:00:00 local time and 23:59:59 local time.***"
                )
              }
            >
              Past 7 Days
              <div>{formatHours(past7DaysHours)} hrs</div>
            </button>

            <button style={getBoxStyle(restHoursWarning)}>
              Rest Period
              <div>{formatHours(restHours)} hrs</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const warningButtonStyle = {
  color: "white",
  padding: "10px 20px",
  border: "none",
  cursor: "pointer",
  borderRadius: "5px",
  fontSize: "10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

export default App;
