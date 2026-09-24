import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const InspectorProfileContext = createContext(null);

export function InspectorProfileProvider({ children }) {
  const [profileState, setProfileState] = useState({ status: "signed-out" });
  const [inspectorSession, setInspectorSession] = useState(null);
  const [profileRequest, setProfileRequest] = useState(0);
  const [photoRequest, setPhotoRequest] = useState(null);
  const pendingPhoto = useRef(null);
  const photoSequence = useRef(0);
  const finishPhoto = useCallback((result) => {
    const pending = pendingPhoto.current;
    if (!pending || result.id !== pending.id) return;
    clearTimeout(pending.timer);
    pendingPhoto.current = null;
    setPhotoRequest(null);
    if (result.error) pending.reject(new Error(result.error));
    else pending.resolve(result.photo);
  }, []);
  useEffect(() => () => {
    if (pendingPhoto.current) finishPhoto({ id: pendingPhoto.current.id, error: "Your account changed. Please try again." });
  }, [inspectorSession?.username, finishPhoto]);
  const requestPhoto = useCallback((method = "GET", photo) => new Promise((resolve, reject) => {
    if (!inspectorSession?.signedIn) return reject(new Error("Please log in first."));
    if (pendingPhoto.current) return reject(new Error("A photo request is already running. Please wait."));
    const id = ++photoSequence.current;
    const timer = setTimeout(() => finishPhoto({ id, error: "Photo request timed out. Please try again." }), 25000);
    pendingPhoto.current = { id, resolve, reject, timer };
    setPhotoRequest({ id, method, photo, username: inspectorSession.username });
  }), [inspectorSession?.signedIn, inspectorSession?.username, finishPhoto]);
  const refreshProfile = useCallback(() => {
    if (!inspectorSession?.signedIn) return;
    setProfileState((previous) => ({ ...previous, status: "loading" }));
    setProfileRequest((value) => value + 1);
  }, [inspectorSession?.signedIn]);
  const value = useMemo(() => ({ profileState, setProfileState, profileRequest, refreshProfile, inspectorSession, setInspectorSession, photoRequest, requestPhoto, finishPhoto }), [profileState, profileRequest, refreshProfile, inspectorSession, photoRequest, requestPhoto, finishPhoto]);
  return <InspectorProfileContext.Provider value={value}>{children}</InspectorProfileContext.Provider>;
}

export const useInspectorProfile = () => useContext(InspectorProfileContext);
