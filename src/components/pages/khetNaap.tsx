import { useEffect, useRef, useState } from "react";
import { MapPin, Trash2, Loader, Save, Search } from "lucide-react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap, Circle, CircleMarker, Marker, Popup, Polygon, Polyline } from "react-leaflet";
import * as turf from "@turf/turf";

import "leaflet/dist/leaflet.css";

interface Measurement {
  areaM2: number;
  areaHa: number;
  areaAcres: number;
  areaBigha: number;
  perimeterM: number;
}

type Position = {
  lat: number;
  lng: number;
};

const DEFAULT_POSITION: Position = {
  lat: 26.394837,
  lng: 80.404412,
};

const userLocationIcon = L.divIcon({
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#059669;border:3px solid white;box-shadow:0 0 0 12px rgba(16,185,129,0.18);"></div>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -10],
});

// Component to control map center, flyTo, and resize handling
function MapController({ position, zoomToLocation }: { position: Position; zoomToLocation?: boolean }) {
  const map = useMap();

  useEffect(() => {
    const updateMap = () => {
      map.invalidateSize();
      const targetZoom = zoomToLocation ? 18 : 17;
      map.flyTo([position.lat, position.lng], targetZoom, { duration: 0.9 });
    };

    if (map) {
      map.whenReady(updateMap);
    }
  }, [map, position.lat, position.lng, zoomToLocation]);

  useEffect(() => {
    let resizeTimer: number | undefined;
    const handleResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => map.invalidateSize(), 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [map]);

  return null;
}

// Component for map click location selection
function MapClickHandler({
  active,
  onLocationSelect,
}: {
  active: boolean;
  onLocationSelect: (pos: Position) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    if (active) {
      map.on("click", handleClick);
    }

    return () => {
      map.off("click", handleClick);
    };
  }, [map, active, onLocationSelect]);

  useEffect(() => {
    const container = map.getContainer();
    if (active) {
      if (map.dragging) map.dragging.disable();
      if (container && container.style) container.style.cursor = "crosshair";
    } else {
      if (map.dragging) map.dragging.enable();
      if (container && container.style) container.style.cursor = "";
    }

    return () => {
      if (map.dragging) map.dragging.enable();
      if (container && container.style) container.style.cursor = "";
    };
  }, [active, map]);

  return null;
}

function calculateMeasurements(latlngs: L.LatLng[]): Measurement | null {
  if (!latlngs || latlngs.length < 3) return null;

  const coords: [number, number][] = latlngs.map((p) => [p.lng, p.lat]);

  const first = coords[0];
  const last = coords[coords.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push(first);
  }

  const polygon = turf.polygon([coords]);
  const line = turf.lineString(coords);

  const areaM2 = turf.area(polygon);
  const perimeterM = turf.length(line, { units: "kilometers" }) * 1000;
  const areaAcres = areaM2 / 4046.8564224;
  const areaBigha = areaM2 / 1609.344;

  return {
    areaM2: Number(areaM2.toFixed(2)),
    areaHa: Number((areaM2 / 10000).toFixed(2)),
    areaAcres: Number(areaAcres.toFixed(2)),
    areaBigha: Number(areaBigha.toFixed(2)),
    perimeterM: Number(perimeterM.toFixed(2)),
  };
}

function buildMeasurementFromPositions(positions: Position[]): Measurement | null {
  if (positions.length < 3) return null;
  const latlngs = positions.map((p) => L.latLng(p.lat, p.lng));
  return calculateMeasurements(latlngs);
}

// Custom draw click handler — collects points on map click and defers finishing to explicit button
function DrawClickHandler({
  drawing,
  onAddPoint,
}: {
  drawing: boolean;
  onAddPoint: (p: Position) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (drawing) {
        e.originalEvent.stopPropagation();
        onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [map, drawing, onAddPoint]);

  // Manage dragging based on drawing mode
  useEffect(() => {
    if (drawing) {
      map.dragging.disable();
      const container = map.getContainer();
      if (container && container.style) container.style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      const container = map.getContainer();
      if (container && container.style) container.style.cursor = '';
    }

    return () => {
      map.dragging.enable();
    };
  }, [map, drawing]);

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 300);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    let resizeTimer: number | undefined;

    const handleResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => map.invalidateSize(), 250);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [map]);

  return null;
}

export default function KhetNaap() {
  const [currentPosition, setCurrentPosition] =
    useState<Position>(DEFAULT_POSITION);

  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Measurement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [hasLocation, setHasLocation] = useState(false);

  // Custom drawing state
  const [points, setPoints] = useState<Position[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Walk mode state
  const [walkModeEnabled, setWalkModeEnabled] = useState(false);
  const [walkStatus, setWalkStatus] = useState<"idle" | "active" | "paused" | "finished">("idle");
  const [walkPoints, setWalkPoints] = useState<Position[]>([]);
  const [walkMeasurements, setWalkMeasurements] = useState<Measurement | null>(null);
  const [walkAccuracy, setWalkAccuracy] = useState<number | null>(null);
  const [walkError, setWalkError] = useState<string | null>(null);

  const walkPointsRef = useRef<Position[]>([]);
  const watchIdRef = useRef<number | null>(null);

  const addPoint = (p: Position) => {
    setPoints((prev) => [...prev, p]);
    setIsFinished(false);
  };

  const deleteLastPoint = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const cancelDrawing = () => {
    setPoints([]);
    setIsDrawing(false);
    setIsFinished(false);
    setMeasurements(null);
  };

  const finishDrawing = () => {
    if (points.length < 3) return;
    const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
    const m = calculateMeasurements(latlngs);
    setMeasurements(m);
    setIsFinished(true);
    setIsDrawing(false);
  };

  const clearWalkSession = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    walkPointsRef.current = [];
    setWalkPoints([]);
    setWalkMeasurements(null);
    setWalkAccuracy(null);
    setWalkError(null);
    setWalkStatus("idle");
    setWalkModeEnabled(true);
    setInfoMessage("🧹 Walk session cleared.");
  };

  const startWalkTracking = (reset = true) => {
    if (!navigator.geolocation) {
      setWalkError("GPS is not supported on this device.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    if (reset) {
      walkPointsRef.current = [];
      setWalkPoints([]);
      setWalkMeasurements(null);
      setWalkAccuracy(null);
    }

    setWalkError(null);
    setWalkModeEnabled(true);
    setWalkStatus("active");
    setInfoMessage("🚶 Walk mode started. Move slowly and the boundary will be traced automatically.");

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const accuracy = position.coords.accuracy;

        setCurrentPosition(newPosition);
        setHasLocation(true);
        setGpsLoading(false);
        setGpsError(null);
        setWalkAccuracy(accuracy);

        if (accuracy > 20) {
          setWalkError("GPS accuracy is too low. Please move to a more open area.");
          return;
        }

        setWalkError(null);
        const previousPoint = walkPointsRef.current[walkPointsRef.current.length - 1];
        const shouldAddPoint = walkPointsRef.current.length === 0 || !previousPoint || turf.distance(
          [previousPoint.lng, previousPoint.lat],
          [newPosition.lng, newPosition.lat],
          { units: "meters" }
        ) >= 3;

        if (shouldAddPoint) {
          const nextPoints = [...walkPointsRef.current, newPosition];
          walkPointsRef.current = nextPoints;
          setWalkPoints(nextPoints);
          setWalkMeasurements(buildMeasurementFromPositions(nextPoints));
        }
      },
      (error) => {
        setWalkStatus("idle");
        if (error.code === error.PERMISSION_DENIED) {
          setWalkError("GPS permission denied. Please allow location access and try again.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setWalkError("GPS position is currently unavailable. Please try again.");
        } else {
          setWalkError("GPS tracking failed. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 20000,
      }
    );

    watchIdRef.current = id;
  };

  const pauseWalkTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWalkStatus("paused");
    setWalkError(null);
    setInfoMessage("⏸️ Walk tracking paused.");
  };

  const resumeWalkTracking = () => {
    startWalkTracking(false);
    setInfoMessage("▶️ Walk tracking resumed.");
  };

  const stopWalkTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWalkStatus("finished");
    setWalkError(null);
    const finalMeasurements = buildMeasurementFromPositions(walkPointsRef.current);
    setWalkMeasurements(finalMeasurements);
    if (finalMeasurements) {
      setInfoMessage("✅ Walk session completed. Final area calculated.");
    } else {
      setInfoMessage("📍 Walk session completed. Add at least 3 points for an area result.");
    }
  };

  const fetchCurrentPosition = (showToast = false) => {
    if (!navigator.geolocation) {
      setGpsError("GPS समर्थन उपलब्ध नहीं है।");
      setGpsLoading(false);
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentPosition(newPos);
        setHasLocation(true);
        setGpsError(null);
        setGpsLoading(false);
        if (showToast) {
          setInfoMessage("✅ आपके वर्तमान स्थान पर map केंद्रित किया गया है।");
        }
      },
      (error) => {
        setHasLocation(false);
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError("GPS अनुमति अस्वीकृत है। कृपया अनुमति दें और फिर से प्रयास करें।");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsError("स्थिति उपलब्ध नहीं है। कृपया फिर प्रयास करें।");
        } else if (error.code === error.TIMEOUT) {
          setGpsError("GPS टाइमआउट हो गया। कृपया पुन: प्रयास करें।");
        } else {
          setGpsError("स्थान खोजने में समस्या हुई।");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    fetchCurrentPosition();
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleUseMyLocation = () => {
    fetchCurrentPosition(true);
  };

  const resetAll = () => {
    setMeasurements(null);
    setSearchQuery("");
    setIsSelectingLocation(false);
    setSearchError(null);
    setInfoMessage("Reset complete. फिर से map draw करें।");
    setCurrentPosition(DEFAULT_POSITION);
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchError("Location name likho phir search karo.");
      return;
    }

    setSearchError(null);
    setInfoMessage(null);
    setSearchLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1&accept-language=en`
      );
      const data = await response.json();

      if (data.length > 0) {
        const result = data[0];
        const newPos = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
        setCurrentPosition(newPos);
        setHasLocation(true);
        setSearchQuery("");
        setInfoMessage(`📍 '${result.display_name.split(",")[0]}' map center ho gaya.`);
      } else {
        setSearchError("Location nahi mila. Dobara try karo.");
      }
    } catch (error) {
      setSearchError("Search mein error aya. Network check karo.");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!infoMessage) return;
    const timer = window.setTimeout(() => setInfoMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [infoMessage]);

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="mx-auto w-full max-w-screen-2xl">
        <section className="bg-gradient-to-r from-emerald-700 to-green-700 px-4 pt-10 pb-6 rounded-b-[2rem] shadow-[0_18px_50px_-30px_rgba(16,185,129,0.8)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center shadow-inner shadow-green-900/10">
                <MapPin size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-white text-2xl font-semibold tracking-tight">
                  📏 खेत नापो
                </h1>
                <p className="text-green-100 text-sm sm:text-base">
                  Satellite map पर field area तेज़ी से measure करें
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white shadow-sm backdrop-blur">
              {gpsLoading ? (
                <p>📡 GPS ढूंढ रहे हैं...</p>
              ) : gpsError ? (
                <p>📍 Default location use हो रही है</p>
              ) : (
                <p>✅ GPS अपडेटेड है</p>
              )}
            </div>
          </div>
        </section>

        <div className="px-4 pt-6 sm:px-0 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-4 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Village/City name लिखकर search करें"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      searchLocation(searchQuery);
                    }
                  }}
                  className="w-full min-w-0 rounded-2xl border border-gray-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <button
                type="button"
                onClick={() => searchLocation(searchQuery)}
                disabled={searchLoading}
                className="inline-flex w-full justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {searchLoading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={gpsLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <MapPin size={16} />
                Use My Location
              </button>

              <div className="space-y-2 text-sm">
                {searchError && (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    {searchError}
                  </p>
                )}
                {gpsError && (
                  <p className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-700">
                    {gpsError}
                  </p>
                )}
                {infoMessage && (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                    {infoMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsSelectingLocation(!isSelectingLocation)}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${isSelectingLocation
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
              >
                {isSelectingLocation ? '📍 Map पर click करें' : '🎯 Map से Select करें'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-4 shadow-lg">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setWalkModeEnabled((prev) => !prev)}
                className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-amber-600"
              >
                🚶 Walk Mode
              </button>

              {walkModeEnabled && (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startWalkTracking(true)}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Start Walk
                    </button>
                    <button
                      type="button"
                      onClick={pauseWalkTracking}
                      disabled={walkStatus !== "active"}
                      className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={resumeWalkTracking}
                      disabled={walkStatus !== "paused"}
                      className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={stopWalkTracking}
                      disabled={walkStatus === "idle" || walkStatus === "finished"}
                      className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Stop
                    </button>
                    <button
                      type="button"
                      onClick={clearWalkSession}
                      className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 p-3 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">Status: {walkStatus === "active" ? "Tracking" : walkStatus === "paused" ? "Paused" : walkStatus === "finished" ? "Completed" : "Idle"}</span>
                      <span className="text-xs text-slate-500">Accuracy: {walkAccuracy !== null ? `${walkAccuracy.toFixed(1)} m` : "Waiting for GPS"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <span>Points: {walkPoints.length}</span>
                      <span>Live area: {walkMeasurements ? `${walkMeasurements.areaM2.toLocaleString()} m²` : "—"}</span>
                    </div>
                    {walkError && <p className="mt-2 text-sm text-red-600">{walkError}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-900">उपग्रह नक्शा | Satellite Map</p>
                <p className="text-xs text-slate-500">Map पर ड्राइंग टूल से शीघ्र area मानें</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                {measurements ? '✅ माप पूरा' : '🖌️ boundary बनाएं'}
              </span>
            </div>

            <div className="relative w-full h-[calc(100vh-18rem)] sm:h-[calc(100vh-17rem)] md:h-[70vh] lg:h-[72vh] xl:h-[70vh]">
              <MapContainer
                center={[currentPosition.lat, currentPosition.lng]}
                zoom={17}
                minZoom={5}
                maxZoom={19}

                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  maxNativeZoom={18}
                  maxZoom={19}

                />
                <TileLayer
                  url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  attribution=""
                  opacity={0.6}
                />

                <MapController position={currentPosition} zoomToLocation={hasLocation} />
                <MapResizeHandler />

                <Circle
                  center={[currentPosition.lat, currentPosition.lng]}
                  radius={10}
                  pathOptions={{ color: '#1D4ED8', fillColor: '#1D4ED8', fillOpacity: 0.65 }}
                />
                <CircleMarker
                  center={[currentPosition.lat, currentPosition.lng]}
                  radius={6}
                  pathOptions={{ color: '#fff', fillColor: '#1D4ED8', fillOpacity: 1 }}
                />
                <Marker position={[currentPosition.lat, currentPosition.lng]} icon={userLocationIcon}>
                  <Popup>
                    {hasLocation ? 'आपका वर्तमान स्थान' : 'चयनित स्थान'}
                  </Popup>
                </Marker>

                <MapClickHandler
                  active={isSelectingLocation}
                  onLocationSelect={(pos) => {
                    setCurrentPosition(pos);
                    setIsSelectingLocation(false);
                    setInfoMessage(`📍 Location चुना गया: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
                  }}
                />
                <DrawClickHandler drawing={isDrawing} onAddPoint={addPoint} />

                {/* Point markers with numbers */}
                {points.map((point, idx) => {
                  const pointIcon = L.divIcon({
                    html: `<div style="width:32px;height:32px;background:#2563eb;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${idx + 1}</div>`,
                    className: '',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  });
                  return (
                    <Marker key={idx} position={[point.lat, point.lng]} icon={pointIcon}>
                      <Popup>Point {idx + 1}</Popup>
                    </Marker>
                  );
                })}

                {/* Preview while drawing */}
                {points.length > 0 && !isFinished && (
                  <Polyline
                    positions={points.map((p) => [p.lat, p.lng])}
                    pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.8 }}
                  />
                )}

                {/* Polygon preview when 3+ points */}
                {points.length >= 3 && !isFinished && (
                  <Polygon
                    positions={points.map((p) => [p.lat, p.lng])}
                    pathOptions={{ color: '#2563eb', fillColor: '#93c5fd', fillOpacity: 0.15, weight: 2 }}
                  />
                )}

                {/* Finished polygon */}
                {isFinished && points.length > 0 && (
                  <Polygon
                    positions={points.map((p) => [p.lat, p.lng])}
                    pathOptions={{ color: '#059669', fillColor: '#34d399', fillOpacity: 0.12, weight: 3 }}
                  />
                )}

                {walkPoints.length > 0 && (
                  <>
                    <Polyline
                      positions={walkPoints.map((p) => [p.lat, p.lng])}
                      pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.95 }}
                    />
                    {walkPoints.length >= 3 && (
                      <Polygon
                        positions={[
                          ...walkPoints.map((p): [number, number] => [p.lat, p.lng]),
                          [walkPoints[0].lat, walkPoints[0].lng],
                        ]}
                        pathOptions={{ color: '#f59e0b', fillColor: '#fde68a', fillOpacity: 0.2, weight: 2 }}
                      />
                    )}
                    {walkPoints.map((point, idx) => {
                      const pointIcon = L.divIcon({
                        html: `<div style="width:24px;height:24px;background:#f59e0b;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${idx + 1}</div>`,
                        className: '',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      });
                      return (
                        <Marker key={`walk-${idx}`} position={[point.lat, point.lng]} icon={pointIcon}>
                          <Popup>Walk Point {idx + 1}</Popup>
                        </Marker>
                      );
                    })}
                  </>
                )}
              </MapContainer>

              {/* Main Boundary Floating Action Button */}
              <button
                onClick={() => setIsDrawing((s) => !s)}
                className={`absolute top-4 left-1/2 -translate-x-1/2 z-[99999] px-6 py-4 rounded-full font-bold text-lg shadow-2xl transition-all duration-300 pointer-events-auto transform hover:scale-110 ${isDrawing
                  ? 'bg-emerald-600 text-white shadow-emerald-600/50'
                  : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/50'
                  }`}
              >
                {isDrawing ? '✅ Drawing Active' : '✏️ Boundary Banaye'}
              </button>

              {/* Drawing Toolbar - appears below main button when active */}
              {(isDrawing || points.length > 0) && (
                //<div className="absolute top-20 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-3 rounded-2xl bg-white shadow-2xl overflow-hidden pointer-events-auto"  >
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[99999] w-[82%] max-w-[260px] rounded-2xl bg-white shadow-2xl overflow-hidden pointer-events-auto">
                  {points.length > 0 && (
                    <div className="bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 text-center border-b border-blue-100">
                      📍 Points Added: <span className="text-lg font-bold text-blue-600">{points.length}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 p-3 bg-slate-50">
                    <button
                      onClick={finishDrawing}
                      disabled={points.length < 3}
                      className="w-full rounded-lg px-4 py-3 text-sm font-semibold bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition pointer-events-auto"
                    >
                      ✅ Finish Polygon
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={deleteLastPoint}
                        disabled={points.length === 0}
                        // className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold bg-yellow-100 text-yellow-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-200 transition pointer-events-auto"
                        className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-emerald-600 text-white disabled:opacity-40"
                      >
                        ↶ Delete Last
                      </button>
                      <button
                        onClick={cancelDrawing}
                        className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition pointer-events-auto"
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 right-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg">
                {gpsLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader size={12} className="animate-spin" /> GPS...
                  </span>
                ) : gpsError ? (
                  '📍 Default location'
                ) : (
                  <span className="flex items-center gap-2">
                    <span>✅ GPS Active</span>
                    {walkAccuracy !== null && <span>• {walkAccuracy.toFixed(1)} m</span>}
                  </span>
                )}
              </div>
            </div>
          </div>

          {measurements ? (
            <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-5 shadow-lg">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900">📊 क्षेत्रफल की गणना</h3>
                  <p className="text-sm text-slate-600">Draw करना बंद करें और परिणाम देखें।</p>
                </div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center justify-center rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-200"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'वर्ग मीटर', value: `${measurements.areaM2.toLocaleString()} m²` },
                  { label: 'हेक्टेयर', value: `${measurements.areaHa} ha` },
                  { label: 'एकड़', value: `${measurements.areaAcres} acre` },
                  { label: 'बिघा', value: `${measurements.areaBigha} bigha` },
                  { label: 'परिधि', value: `${measurements.perimeterM} m` },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                    <p className="mt-3 text-2xl font-bold text-emerald-700">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex-1 rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-200"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setInfoMessage('Save feature जल्द आएगा')}
                  className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Save size={16} /> Save
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-sky-50 rounded-3xl border border-sky-200 p-5 shadow-md">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">🎯 कैसे उपयोग करें:</h3>
              <ol className="space-y-2 text-sm text-slate-700">
                <li>1. Village/City search करें या Map से location select करें।</li>
                <li>2. Map draw tools से polygon या rectangle चुनें।</li>
                <li>3. अपने खेत की boundary draw करें।</li>
                <li>4. Area automatically m², hectare और acre में देखिए।</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
