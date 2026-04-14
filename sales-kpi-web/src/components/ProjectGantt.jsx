import React, { useEffect, useRef } from "react";
import Gantt from "frappe-gantt";
import api from "../api";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";

export default function ProjectGantt() {
  const { projectId } = useParams();   // ✅ get from URL
  const ganttRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        const res = await api.get(`/enquiries/project-summary/${projectId}`);
        const milestones = res.data?.milestones || [];

        const tasks = milestones.map((m, idx) => ({
          id: `task-${idx}`,
          name: m.milestone,
          start: dayjs(m.planDate).format("YYYY-MM-DD"),
          end: dayjs(m.actualDate || m.planDate).format("YYYY-MM-DD"),
          progress: m.status === "Completed" ? 100 : 0,
          custom_class:
            m.status === "Delay"
              ? "bar-delay"
              : m.status === "WIP"
              ? "bar-wip"
              : m.status === "Shifted"
              ? "bar-shifted"
              : "bar-plan",
        }));

        if (ganttRef.current) {
          ganttRef.current.innerHTML = ""; // clear previous chart
          new Gantt(ganttRef.current, tasks, {
            view_mode: "Week",
            language: "en",
          });
        }
      } catch (err) {
        console.error("Failed to load Gantt data", err);
      }
    };

    fetchData();
  }, [projectId]);

  return <div ref={ganttRef} />;
}
