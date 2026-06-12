// ATM locator using Leaflet + OpenStreetMap + Overpass API (100% free, no API key)
import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/atmlocator.css";

// Fix leaflet default marker icons (broken in webpack/vite)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom gold marker for ATMs
const atmIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#c9a84c;border:2.5px solid #000;
    display:flex;align-items:center;justify-content:center;
    font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.5);">💳</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Blue marker for user location
const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#3b82f6;border:3px solid #fff;
    box-shadow:0 0 0 3px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.5);">
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Helper to fly map to new center
function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom]);
  return null;
}

interface ATM {
  id: number;
  lat: number;
  lon: number;
  name: string;
  operator?: string;
  address?: string;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

export default function ATMLocator() {
  const [center, setCenter] = useState<[number, number]>([37.3382, -121.8863]);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [atms, setAtms] = useState<ATM[]>([]);
  const [selectedATM, setSelectedATM] = useState<ATM | null>(null);
  const [searchRadius, setSearchRadius] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const suggestTimeoutRef = useRef<number | null>(null);

  // Get user's GPS location
  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos: [number, number] = [coords.latitude, coords.longitude];
        setUserLocation(pos);
        setCenter(pos);
        setFlyTarget({ center: pos, zoom: 14 });
        setLoadingLocation(false);
      },
      () => setLoadingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Nominatim address autocomplete
  const fetchSuggestions = async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=us&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch { /* silent */ }
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    suggestTimeoutRef.current = setTimeout(() => fetchSuggestions(value), 350) as any;
  };

  const selectSuggestion = (s: Suggestion) => {
    const pos: [number, number] = [parseFloat(s.lat), parseFloat(s.lon)];
    setSearchQuery(s.display_name.split(",").slice(0, 2).join(","));
    setShowSuggestions(false);
    setCenter(pos);
    setUserLocation(pos);
    setFlyTarget({ center: pos, zoom: 14 });
  };

  // Overpass API — find real ATMs
  const searchNearbyATMs = async () => {
    setSearching(true);
    setAtms([]);
    setSelectedATM(null);

    const radiusMeters = searchRadius * 1609.34;
    const query = `[out:json][timeout:25];
      node["amenity"="atm"](around:${radiusMeters},${center[0]},${center[1]});
      out body;`;

    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });
      const data = await res.json();
      const results: ATM[] = (data.elements || []).map((el: any) => ({
        id: el.id,
        lat: el.lat,
        lon: el.lon,
        name: el.tags?.name || el.tags?.operator || "ATM",
        operator: el.tags?.operator,
        address: [el.tags?.["addr:housenumber"], el.tags?.["addr:street"], el.tags?.["addr:city"]]
          .filter(Boolean).join(" "),
      }));
      setAtms(results);
    } catch {
      alert("Failed to fetch ATMs. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const sortedATMs = useMemo(() => {
    if (!userLocation) return atms;
    return [...atms].sort((a, b) =>
      parseFloat(haversine(userLocation[0], userLocation[1], a.lat, a.lon)) -
      parseFloat(haversine(userLocation[0], userLocation[1], b.lat, b.lon))
    );
  }, [atms, userLocation]);

  const openDirections = (atm: ATM) => {
    const origin = userLocation ? `${userLocation[0]},${userLocation[1]}` : "";
    window.open(
      `https://www.google.com/maps/dir/${origin}/${atm.lat},${atm.lon}`,
      "_blank"
    );
  };

  return (
    <div className="atm-locator-page">
      <div className="atm-hero">
        <h1>ATM & Branch Locator</h1>
        <p>Find nearby ATMs in real-time</p>
      </div>

      <div className="atm-layout">
        <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? "✕ Close" : "☰ Locations"}
        </button>

        <aside className={`atm-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-section">
            <h2>Find a Location</h2>

            <div className="search-wrapper">
              <input
                type="text"
                className="location-search-input"
                placeholder="Enter address, city, or ZIP code"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="search-suggestions">
                  {suggestions.map((s, i) => (
                    <div key={i} className="suggestion-item" onClick={() => selectSuggestion(s)}>
                      {s.display_name.split(",").slice(0, 3).join(",")}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(218,165,32,0.2)" }} />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", letterSpacing: "1px" }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(218,165,32,0.2)" }} />
            </div>

            <button className="location-button" onClick={getUserLocation} disabled={loadingLocation}>
              {loadingLocation ? "Getting Location..." : "Use Current Location"}
            </button>
          </div>

          <div className="sidebar-section">
            <label className="filter-label">Search Radius</label>
            <select className="radius-select" value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))}>
              <option value={1}>Within 1 mile</option>
              <option value={3}>Within 3 miles</option>
              <option value={5}>Within 5 miles</option>
              <option value={10}>Within 10 miles</option>
              <option value={25}>Within 25 miles</option>
            </select>
            <button className="location-button" onClick={searchNearbyATMs} disabled={searching} style={{ marginTop: "1rem" }}>
              {searching ? "Searching..." : "Search ATMs"}
            </button>
          </div>

          <div className="sidebar-section locations-section">
            <div className="section-header">
              <h2>Nearby ATMs</h2>
              <span className="count-badge">{sortedATMs.length}</span>
            </div>
            <div className="locations-list">
              {sortedATMs.map((atm) => {
                const dist = userLocation ? haversine(userLocation[0], userLocation[1], atm.lat, atm.lon) : null;
                return (
                  <div
                    key={atm.id}
                    className={`location-card ${selectedATM?.id === atm.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedATM(atm);
                      setFlyTarget({ center: [atm.lat, atm.lon], zoom: 16 });
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <div className="location-header">
                      <h3>{atm.name}</h3>
                      <span className="type-label">ATM</span>
                    </div>
                    {atm.address && <p className="location-address">{atm.address}</p>}
                    {dist && <p className="location-distance">{dist} miles away</p>}
                    <button className="directions-button" onClick={(e) => { e.stopPropagation(); openDirections(atm); }}>
                      Get Directions
                    </button>
                  </div>
                );
              })}
              {atms.length === 0 && !searching && (
                <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                  Click "Search ATMs" to find nearby locations
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="map-section">
          <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }} zoomControl={false}>
            {/* CartoDB Dark Matter tiles — free, no key */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              subdomains="abcd"
              maxZoom={20}
            />

            {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

            {userLocation && (
              <Marker position={userLocation} icon={userIcon}>
                <Popup>
                  <div style={{ fontFamily: "Garamond, serif", padding: "4px" }}>
                    <strong>Your Location</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {sortedATMs.map((atm) => (
              <Marker
                key={atm.id}
                position={[atm.lat, atm.lon]}
                icon={atmIcon}
                eventHandlers={{ click: () => setSelectedATM(atm) }}
              >
                <Popup>
                  <div style={{ fontFamily: "Garamond, serif", minWidth: "200px", padding: "8px 4px" }}>
                    <h3 style={{ margin: "0 0 6px", fontSize: "15px", color: "#0a0a0a" }}>{atm.name}</h3>
                    {atm.address && <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#666" }}>{atm.address}</p>}
                    {userLocation && (
                      <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#c9a84c", fontWeight: 600 }}>
                        {haversine(userLocation[0], userLocation[1], atm.lat, atm.lon)} miles away
                      </p>
                    )}
                    <button
                      onClick={() => openDirections(atm)}
                      style={{
                        width: "100%", padding: "8px", background: "#c9a84c", border: "none",
                        borderRadius: "5px", color: "#000", fontWeight: 700, fontSize: "12px",
                        letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer",
                        fontFamily: "Garamond, serif",
                      }}
                    >
                      Get Directions
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}
