"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchActivityFromStrava } from "@/lib/actions"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

// Polyline decoder function (from Leaflet.encoded)
function decodePolyline(encoded: string) {
  if (!encoded || typeof encoded !== "string") return []

  const points = []
  let index = 0,
    lat = 0,
    lng = 0

  try {
    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlat = result & 1 ? ~(result >> 1) : result >> 1
      lat += dlat

      shift = 0
      result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlng = result & 1 ? ~(result >> 1) : result >> 1
      lng += dlng

      points.push([lat / 1e5, lng / 1e5])
    }
  } catch (error) {
    console.error("Error decoding polyline:", error)
  }

  return points
}

// Helper function to deeply search for a polyline in an object
function findPolyline(obj: any): string | null {
  if (!obj) return null

  // Direct properties
  if (obj.polyline && typeof obj.polyline === "string") return obj.polyline
  if (obj.summary_polyline && typeof obj.summary_polyline === "string") return obj.summary_polyline

  // Check map property
  if (obj.map) {
    if (obj.map.polyline && typeof obj.map.polyline === "string") return obj.map.polyline
    if (obj.map.summary_polyline && typeof obj.map.summary_polyline === "string") return obj.map.summary_polyline
  }

  // For Strava API responses, check for map.summary_polyline
  if (typeof obj === "object") {
    for (const key in obj) {
      if (typeof obj[key] === "object") {
        const result = findPolyline(obj[key])
        if (result) return result
      }
    }
  }

  return null
}

// Helper function to extract coordinates from activity data
function extractCoordinates(data: any): { start?: [number, number]; end?: [number, number] } {
  const result: { start?: [number, number]; end?: [number, number] } = {}

  if (!data) return result

  try {
    // Try to find start_latlng and end_latlng in the data
    if (data.start_latlng && Array.isArray(data.start_latlng) && data.start_latlng.length >= 2) {
      result.start = [data.start_latlng[0], data.start_latlng[1]]
    }

    if (data.end_latlng && Array.isArray(data.end_latlng) && data.end_latlng.length >= 2) {
      result.end = [data.end_latlng[0], data.end_latlng[1]]
    }

    // If not found directly, try to find them in nested objects
    if ((!result.start || !result.end) && typeof data === "object") {
      for (const key in data) {
        if (typeof data[key] === "object") {
          if (
            !result.start &&
            data[key]?.start_latlng &&
            Array.isArray(data[key].start_latlng) &&
            data[key].start_latlng.length >= 2
          ) {
            result.start = [data[key].start_latlng[0], data[key].start_latlng[1]]
          }

          if (
            !result.end &&
            data[key]?.end_latlng &&
            Array.isArray(data[key].end_latlng) &&
            data[key].end_latlng.length >= 2
          ) {
            result.end = [data[key].end_latlng[0], data[key].end_latlng[1]]
          }
        }
      }
    }
  } catch (error) {
    console.error("Error extracting coordinates:", error)
  }

  return result
}

interface ActivityMapProps {
  mapData?: any
  rawData?: any
  stravaId?: number
  polyline?: string
  activityType?: string
  activityDate?: string
  activities?: Array<{
    id: number
    name: string
    type: string
    start_date: string
    polyline?: string
    map?: any
    strava_id?: number
    elapsed_time?: number
  }>
}

export function ActivityMap({
  mapData,
  rawData,
  stravaId,
  polyline,
  activityType = "default",
  activityDate,
  activities = [],
}: ActivityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null) // Store map instance in a ref to avoid state updates
  const [isFetchingFromStrava, setIsFetchingFromStrava] = useState(false)
  const [stravaActivity, setStravaActivity] = useState<any>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [hoveredActivityId, setHoveredActivityId] = useState<number | null>(null)

  const [showOverviewMap, setShowOverviewMap] = useState(false)
  const overviewMapRef = useRef<HTMLDivElement>(null)
  const overviewMapInstanceRef = useRef<any>(null)

  // Store references to map elements for each activity
  const activityMapElementsRef = useRef<Map<number, { route?: any; startMarker?: any; endMarker?: any }>>(new Map())

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true)

    // Cleanup function to ensure map is destroyed when component unmounts
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        setMapInitialized(false)
      }
    }
  }, [])

  // Function to highlight an activity on the map
  const highlightActivityOnMap = (activityId: number | null) => {
    const elements = activityMapElementsRef.current

    // Reset all activities to normal style
    elements.forEach((element, id) => {
      if (element.route) {
        element.route.setStyle({
          weight: 3,
          opacity: 0.8,
        })
      }
    })

    // Highlight the hovered activity
    if (activityId && elements.has(activityId)) {
      const element = elements.get(activityId)
      if (element?.route) {
        element.route.setStyle({
          weight: 5,
          opacity: 1.0,
        })
        // Bring to front
        element.route.bringToFront()
      }
    }
  }

  // Function to zoom to an activity on the map
  const zoomToActivityOnMap = (activityId: number) => {
    const elements = activityMapElementsRef.current
    const activity = activities.find((a) => a.id === activityId)

    if (!activity || !mapInstanceRef.current) return

    if (elements.has(activityId)) {
      const element = elements.get(activityId)
      if (element?.route) {
        // Zoom to the route bounds
        mapInstanceRef.current.fitBounds(element.route.getBounds(), { padding: [20, 20] })
        return
      }
    }

    // Fallback: try to extract coordinates and zoom to them
    const coordinates = extractCoordinates(activity)
    if (coordinates.start) {
      if (coordinates.end) {
        const L = require("leaflet")
        const routeBounds = L.latLngBounds([coordinates.start, coordinates.end])
        mapInstanceRef.current.fitBounds(routeBounds, { padding: [50, 50] })
      } else {
        mapInstanceRef.current.setView(coordinates.start, 15)
      }
    }
  }

  // Function to create and manage the overview map
  const createOverviewMap = async (activities: any[], mapData: any, rawData: any, stravaData: any) => {
    if (!overviewMapRef.current || !isClient || !showOverviewMap) return

    // Clean up previous overview map instance if it exists
    if (overviewMapInstanceRef.current) {
      overviewMapInstanceRef.current.remove()
      overviewMapInstanceRef.current = null
    }

    // Import Leaflet dynamically
    const L = await import("leaflet")

    // Calculate the center point and bounds for all activities
    let centerLat = 0
    let centerLng = 0
    let validPoints = 0
    const allBounds = L.latLngBounds([])

    // Process multiple activities
    if (activities && activities.length > 0) {
      activities.forEach((activity) => {
        const polylineData = activity.polyline || findPolyline(activity.map) || ""

        if (polylineData) {
          const polylineCoords = decodePolyline(polylineData)
          if (polylineCoords.length > 0) {
            // Use the center point of the route
            const routeBounds = L.latLngBounds(polylineCoords)
            const routeCenter = routeBounds.getCenter()
            centerLat += routeCenter.lat
            centerLng += routeCenter.lng
            validPoints++
            allBounds.extend(routeBounds)
          }
        } else {
          // Try to extract coordinates as fallback
          const coordinates = extractCoordinates(activity)
          if (coordinates.start) {
            centerLat += coordinates.start[0]
            centerLng += coordinates.start[1]
            validPoints++
            allBounds.extend(coordinates.start)
            if (coordinates.end) {
              allBounds.extend(coordinates.end)
            }
          }
        }
      })
    } else {
      // Single activity - try to find center point
      const polylineData = findPolyline(mapData) || findPolyline(rawData) || findPolyline(stravaData) || ""

      if (polylineData) {
        const polylineCoords = decodePolyline(polylineData)
        if (polylineCoords.length > 0) {
          const routeBounds = L.latLngBounds(polylineCoords)
          const routeCenter = routeBounds.getCenter()
          centerLat = routeCenter.lat
          centerLng = routeCenter.lng
          validPoints = 1
          allBounds.extend(routeBounds)
        }
      } else {
        // Try to extract coordinates as fallback
        const coordinates = extractCoordinates(stravaData) || extractCoordinates(mapData) || extractCoordinates(rawData)
        if (coordinates.start) {
          centerLat = coordinates.start[0]
          centerLng = coordinates.start[1]
          validPoints = 1
          allBounds.extend(coordinates.start)
          if (coordinates.end) {
            allBounds.extend(coordinates.end)
          }
        }
      }
    }

    if (validPoints === 0) return

    // Calculate average center point
    const avgLat = centerLat / validPoints
    const avgLng = centerLng / validPoints

    // Determine appropriate zoom level based on the bounds
    // Start with a state-level zoom and adjust based on the span of coordinates
    let zoomLevel = 7 // Default state-level zoom

    if (allBounds.isValid()) {
      const latSpan = allBounds.getNorth() - allBounds.getSouth()
      const lngSpan = allBounds.getEast() - allBounds.getWest()
      const maxSpan = Math.max(latSpan, lngSpan)

      // Adjust zoom based on coordinate span
      if (maxSpan > 10)
        zoomLevel = 5 // Multi-state level
      else if (maxSpan > 5)
        zoomLevel = 6 // Large state level
      else if (maxSpan > 2)
        zoomLevel = 7 // State level
      else if (maxSpan > 1)
        zoomLevel = 8 // Regional level
      else if (maxSpan > 0.5)
        zoomLevel = 9 // County level
      else zoomLevel = 10 // City level
    }

    // Create the overview map
    const overviewMap = L.map(overviewMapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView([avgLat, avgLng], zoomLevel)

    overviewMapInstanceRef.current = overviewMap

    // Add OpenStreetMap tiles with reduced opacity
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "",
      opacity: 0.7,
    }).addTo(overviewMap)

    // Create a star icon for the activity location
    const starIcon = L.divIcon({
      html: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="#FFD700" stroke="#FF8C00" strokeWidth="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `,
      className: "overview-star-marker",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    // Add the star marker at the center point
    L.marker([avgLat, avgLng], { icon: starIcon }).addTo(overviewMap)

    // Add a subtle border to the overview map
    const mapElement = overviewMapRef.current
    if (mapElement) {
      mapElement.style.border = "2px solid rgba(0, 0, 0, 0.3)"
      mapElement.style.borderRadius = "8px"
    }
  }

  // Update map highlighting when hoveredActivityId changes
  useEffect(() => {
    if (mapInitialized && activities.length > 0) {
      highlightActivityOnMap(hoveredActivityId)
    }
  }, [hoveredActivityId, mapInitialized, activities.length])

  // Effect to create/destroy overview map when showOverviewMap changes
  useEffect(() => {
    if (showOverviewMap && isClient && mapInitialized) {
      createOverviewMap(activities, mapData, rawData, stravaActivity)
    } else if (overviewMapInstanceRef.current) {
      overviewMapInstanceRef.current.remove()
      overviewMapInstanceRef.current = null
    }
  }, [showOverviewMap, isClient, mapInitialized, activities, mapData, rawData, stravaActivity])

  // Function to render the map with the given data
  const renderMap = async (
    mapData: any,
    rawData: any,
    stravaData: any = null,
    directPolyline: string | null = null,
  ) => {
    if (!mapRef.current || !isClient) return

    // Clean up previous map instance if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
      setMapInitialized(false)
    }

    // Clear activity elements reference
    activityMapElementsRef.current.clear()

    // Import Leaflet dynamically only on the client side
    const L = await import("leaflet")
    // Also import the CSS
    await import("leaflet/dist/leaflet.css")

    // If we have multiple activities, we'll render them all
    if (activities && activities.length > 0) {
      // Initialize map
      const map = L.map(mapRef.current).setView([0, 0], 13)
      mapInstanceRef.current = map
      setMapInitialized(true)

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      // Create bounds to fit all activities
      const bounds = L.latLngBounds([])
      let hasValidData = false

      // Store route references for click zoom functionality
      const activityRoutes = new Map()

      // Process each activity
      activities.forEach((activity, index) => {
        try {
          // Get a color for this activity
          const color = getColorForIndex(index)

          // Initialize activity elements storage
          const activityElements: { route?: any; startMarker?: any; endMarker?: any } = {}

          // Try to get the polyline from the activity
          const polylineData = activity.polyline || findPolyline(activity.map) || ""

          if (polylineData) {
            const polylineCoords = decodePolyline(polylineData)

            if (polylineCoords.length > 0) {
              hasValidData = true

              // Create a polyline and add it to the map
              const routeLine = L.polyline(polylineCoords, {
                color: color,
                weight: 3,
                opacity: 0.8,
              }).addTo(map)

              // Store the route line for this activity
              activityRoutes.set(activity.id, routeLine)
              activityElements.route = routeLine

              // Add the route to the bounds
              bounds.extend(routeLine.getBounds())

              // Add start marker with tooltip and hover events
              const startPoint = polylineCoords[0]
              const startDate = new Date(activity.start_date)
              const marker = L.marker(startPoint, { icon: createStartIcon(L) })
                .addTo(map)
                .bindTooltip(`Start: ${activity.name}<br>${format(startDate, "MMM d, yyyy 'at' h:mm a")}`, {
                  permanent: false,
                  direction: "top",
                })

              activityElements.startMarker = marker

              // Add hover and click events to highlight activity in list and zoom to route
              marker.on("mouseover", () => {
                setHoveredActivityId(activity.id)
              })

              marker.on("mouseout", () => {
                setHoveredActivityId(null)
              })

              marker.on("click", () => {
                // Zoom to fit the entire route
                const route = activityRoutes.get(activity.id)
                if (route) {
                  map.fitBounds(route.getBounds(), { padding: [20, 20] })
                }
              })

              // Add end marker if different from start
              const endPoint = polylineCoords[polylineCoords.length - 1]
              if (startPoint[0] !== endPoint[0] || startPoint[1] !== endPoint[1]) {
                const finishDate = new Date(startDate.getTime() + activity.elapsed_time * 1000)
                const endMarker = L.marker(endPoint, { icon: createFinishIcon(L) })
                  .addTo(map)
                  .bindTooltip(`Finish: ${activity.name}<br>${format(finishDate, "MMM d, yyyy 'at' h:mm a")}`, {
                    permanent: false,
                    direction: "top",
                  })

                activityElements.endMarker = endMarker

                // Add hover and click events to end marker as well
                endMarker.on("mouseover", () => {
                  setHoveredActivityId(activity.id)
                })

                endMarker.on("mouseout", () => {
                  setHoveredActivityId(null)
                })

                endMarker.on("click", () => {
                  // Zoom to fit the entire route
                  const route = activityRoutes.get(activity.id)
                  if (route) {
                    map.fitBounds(route.getBounds(), { padding: [20, 20] })
                  }
                })
              }
            }
          } else {
            // Try to extract coordinates as fallback
            const coordinates = extractCoordinates(activity)

            if (coordinates.start) {
              hasValidData = true

              // Add start marker with tooltip and hover events
              const startMarker = L.marker(coordinates.start, { icon: createStartIcon(L) })
                .addTo(map)
                .bindTooltip(
                  `Start: ${activity.name}<br>${format(new Date(activity.start_date), "MMM d, yyyy 'at' h:mm a")}`,
                  {
                    permanent: false,
                    direction: "top",
                  },
                )

              activityElements.startMarker = startMarker

              // Add hover and click events
              startMarker.on("mouseover", () => {
                setHoveredActivityId(activity.id)
              })

              startMarker.on("mouseout", () => {
                setHoveredActivityId(null)
              })

              startMarker.on("click", () => {
                // Zoom to fit start and end points if available
                if (coordinates.end) {
                  const routeBounds = L.latLngBounds([coordinates.start, coordinates.end])
                  map.fitBounds(routeBounds, { padding: [50, 50] })
                } else {
                  // Just zoom to the start point
                  map.setView(coordinates.start, 15)
                }
              })

              bounds.extend(coordinates.start)

              // Add end marker if available
              if (coordinates.end) {
                const endMarker = L.marker(coordinates.end, { icon: createFinishIcon(L) })
                  .addTo(map)
                  .bindTooltip(
                    `Finish: ${activity.name}<br>${format(new Date(activity.start_date), "MMM d, yyyy 'at' h:mm a")}`,
                    {
                      permanent: false,
                      direction: "top",
                    },
                  )

                activityElements.endMarker = endMarker

                // Add hover and click events to end marker
                endMarker.on("mouseover", () => {
                  setHoveredActivityId(activity.id)
                })

                endMarker.on("mouseout", () => {
                  setHoveredActivityId(null)
                })

                endMarker.on("click", () => {
                  // Zoom to fit start and end points
                  const routeBounds = L.latLngBounds([coordinates.start, coordinates.end])
                  map.fitBounds(routeBounds, { padding: [50, 50] })
                })

                bounds.extend(coordinates.end)

                // Draw a dashed line between start and end
                const routeLine = L.polyline([coordinates.start, coordinates.end], {
                  color: color,
                  weight: 2,
                  dashArray: "5, 10",
                  opacity: 0.7,
                }).addTo(map)

                activityElements.route = routeLine
              }
            }
          }

          // Store the activity elements
          activityMapElementsRef.current.set(activity.id, activityElements)
        } catch (error) {
          console.error(`Error rendering activity ${activity.id}:`, error)
        }
      })

      // Fit the map to the bounds of all activities
      if (hasValidData) {
        map.fitBounds(bounds, { padding: [30, 30] })
      } else {
        // If no valid data, show a message
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div class="flex items-center justify-center h-full text-muted-foreground">
              <p>No map data available for the selected activities</p>
            </div>
          `
        }
      }

      return
    }

    // Try to get the polyline from different possible sources
    let polylineData = ""
    const debugMessages = []

    try {
      // First check if we have a direct polyline passed as a prop
      if (directPolyline) {
        polylineData = directPolyline
        debugMessages.push("Using direct polyline from props: " + directPolyline.substring(0, 20) + "...")
      }

      // If no direct polyline, check if rawData has a polyline property
      else if (rawData && rawData.polyline && typeof rawData.polyline === "string") {
        polylineData = rawData.polyline
        debugMessages.push("Using polyline from rawData.polyline: " + polylineData.substring(0, 20) + "...")
      }

      // Next try to find polyline in Strava data if available
      else if (stravaData) {
        debugMessages.push("Checking Strava data for polyline...")
        const stravaPolyline = findPolyline(stravaData)
        if (stravaPolyline) {
          polylineData = stravaPolyline
          debugMessages.push("Found polyline in Strava data: " + polylineData.substring(0, 20) + "...")
        } else {
          debugMessages.push("No polyline found in Strava data")
        }
      }

      // If still no polyline, try our local data
      else if (!polylineData) {
        // Try to find polyline using our helper function
        debugMessages.push("Checking local data for polyline...")

        const foundPolyline = findPolyline(mapData) || findPolyline(rawData)
        if (foundPolyline) {
          polylineData = foundPolyline
          debugMessages.push("Found polyline in local data: " + polylineData.substring(0, 20) + "...")
        } else {
          debugMessages.push("No polyline found in local data")
        }

        // If we still don't have a polyline, try parsing strings
        if (!polylineData) {
          // Try to parse mapData if it's a string
          if (typeof mapData === "string") {
            try {
              debugMessages.push("Trying to parse mapData as JSON...")
              const parsedMapData = JSON.parse(mapData)
              const parsedPolyline = findPolyline(parsedMapData)
              if (parsedPolyline) {
                polylineData = parsedPolyline
                debugMessages.push("Found polyline in parsed mapData: " + polylineData.substring(0, 20) + "...")
              } else {
                debugMessages.push("No polyline found in parsed mapData")
              }
            } catch (e) {
              debugMessages.push("mapData is not a valid JSON string")
            }
          }

          // Try to parse rawData if it's a string
          if (!polylineData && typeof rawData === "string") {
            try {
              debugMessages.push("Trying to parse rawData as JSON...")
              const parsedRawData = JSON.parse(rawData)
              const parsedPolyline = findPolyline(parsedRawData)
              if (parsedPolyline) {
                polylineData = parsedPolyline
                debugMessages.push("Found polyline in parsed rawData: " + polylineData.substring(0, 20) + "...")
              } else {
                debugMessages.push("No polyline found in parsed rawData")
              }
            } catch (e) {
              debugMessages.push("rawData is not a valid JSON string")
            }
          }
        }
      }
    } catch (error) {
      debugMessages.push("Error extracting polyline: " + error.message)
      console.error("Error extracting polyline:", error)
    }

    // Extract start and end coordinates as fallback
    const coordinates = extractCoordinates(stravaData) || extractCoordinates(mapData) || extractCoordinates(rawData)
    debugMessages.push("Extracted coordinates: " + JSON.stringify(coordinates))

    // Set debug info
    setDebugInfo(debugMessages.join("\n"))

    // If no polyline and no coordinates, show fallback message
    if (!polylineData && !coordinates.start) {
      debugMessages.push("No polyline or coordinates found in any data source")
      setDebugInfo(debugMessages.join("\n"))

      if (mapRef.current) {
        if (stravaId && !stravaData && !fetchError) {
          // Show fetch from Strava button
          mapRef.current.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p class="mb-4">No map data available for this activity in the database</p>
              <div id="fetch-strava-btn" class="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>
                Fetch from Strava
              </div>
              <a href="https://www.strava.com/activities/${stravaId}" target="_blank" rel="noopener noreferrer" 
                 class="mt-2 flex items-center gap-2 text-sm underline text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                View on Strava
              </a>
            </div>
          `
          // Add event listener to the button
          setTimeout(() => {
            const fetchBtn = document.getElementById("fetch-strava-btn")
            if (fetchBtn) {
              fetchBtn.addEventListener("click", () => {
                if (stravaId) {
                  setIsFetchingFromStrava(true)
                  fetchActivityFromStrava(stravaId)
                    .then((data) => {
                      setStravaActivity(data)
                      setFetchError(null)
                    })
                    .catch((error) => {
                      setFetchError(error.message || "Failed to fetch from Strava")
                    })
                    .finally(() => {
                      setIsFetchingFromStrava(false)
                    })
                }
              })
            }
          }, 0)
        } else if (fetchError) {
          // Show error message
          mapRef.current.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p class="mb-4 text-red-500">Error fetching from Strava: ${fetchError}</p>
              <a href="https://www.strava.com/activities/${stravaId}" target="_blank" rel="noopener noreferrer" 
                 class="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                View on Strava
              </a>
            </div>
          `
        } else {
          // Standard no data message
          mapRef.current.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p class="mb-4">No map data available for this activity</p>
              ${
                stravaId
                  ? `
                <a href="https://www.strava.com/activities/${stravaId}" target="_blank" rel="noopener noreferrer" 
                   class="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  View on Strava
                </a>
              `
                  : ""
              }
            </div>
          `
        }
        return
      }
    }

    // Initialize map
    const map = L.map(mapRef.current).setView([0, 0], 13)
    mapInstanceRef.current = map
    setMapInitialized(true)

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    try {
      if (polylineData) {
        // Decode the polyline
        const polylineCoords = decodePolyline(polylineData)
        debugMessages.push(
          "Decoded coordinates: " +
            (polylineCoords.length > 0 ? "Found " + polylineCoords.length + " points" : "No coordinates decoded"),
        )
        setDebugInfo(debugMessages.join("\n"))

        if (polylineCoords.length > 0) {
          // Create a polyline and add it to the map
          const routeLine = L.polyline(polylineCoords, { color: "red", weight: 3 }).addTo(map)

          // Fit the map to the bounds of the route
          map.fitBounds(routeLine.getBounds())

          // Add start and end markers with standard icons and tooltips
          const startPoint = polylineCoords[0]
          const endPoint = polylineCoords[polylineCoords.length - 1]

          // Calculate start and finish dates
          const startDate = activityDate ? new Date(activityDate) : new Date()
          const finishDate = activityDate
            ? new Date(new Date(activityDate).getTime() + (rawData?.elapsed_time || 0) * 1000)
            : new Date()

          // Add start marker with tooltip
          L.marker(startPoint, { icon: createStartIcon(L) })
            .addTo(map)
            .bindTooltip(`Start: ${format(startDate, "MMM d, yyyy 'at' h:mm a")}`, {
              permanent: false,
              direction: "top",
            })

          // Only add end marker if it's different from start (for non-loop activities)
          if (startPoint[0] !== endPoint[0] || startPoint[1] !== endPoint[1]) {
            L.marker(endPoint, { icon: createFinishIcon(L) })
              .addTo(map)
              .bindTooltip(`Finish: ${format(finishDate, "MMM d, yyyy 'at' h:mm a")}`, {
                permanent: false,
                direction: "top",
              })
          }
        }
      } else if (coordinates.start) {
        // Fallback to using start/end coordinates
        const startPoint = coordinates.start
        const startDate = activityDate ? new Date(activityDate) : new Date()
        const finishDate = activityDate
          ? new Date(new Date(activityDate).getTime() + (rawData?.elapsed_time || 0) * 1000)
          : new Date()

        // Add start marker with tooltip
        L.marker(startPoint, { icon: createStartIcon(L) })
          .addTo(map)
          .bindTooltip(`Start: ${format(startDate, "MMM d, yyyy 'at' h:mm a")}`, {
            permanent: false,
            direction: "top",
          })

        // If we have an end point and it's different from the start
        if (
          coordinates.end &&
          (coordinates.start[0] !== coordinates.end[0] || coordinates.start[1] !== coordinates.end[1])
        ) {
          L.marker(coordinates.end, { icon: createFinishIcon(L) })
            .addTo(map)
            .bindTooltip(`Finish: ${format(finishDate, "MMM d, yyyy 'at' h:mm a")}`, {
              permanent: false,
              direction: "top",
            })

          // Draw a straight line between start and end
          const routeLine = L.polyline([coordinates.start, coordinates.end], {
            color: "blue",
            weight: 2,
            dashArray: "5, 10", // Make it dashed to indicate it's an approximation
          }).addTo(map)

          // Fit the map to show both points
          map.fitBounds(routeLine.getBounds())
        } else {
          // Just center on the start point
          map.setView(startPoint, 13)
        }
      }
    } catch (error) {
      debugMessages.push("Error rendering map: " + error.message)
      setDebugInfo(debugMessages.join("\n"))
      console.error("Error rendering map:", error)
      if (mapRef.current) {
        mapRef.current.innerHTML =
          '<div class="flex items-center justify-center h-full text-muted-foreground">Error rendering map data</div>'
      }
    }
  }

  // Create custom icon for activity type
  function createActivityIcon(L: any, type: string) {
    // Define colors for different activity types - using original colors
    const colors = {
      run: "#FF0000", // Red
      ride: "#0000FF", // Blue
      swim: "#00FFFF", // Cyan
      hike: "#008000", // Green
      walk: "#00FF00", // Light Green
      default: "#800080", // Purple
    }

    // Normalize the type to lowercase for consistent comparison
    const normalizedType = type.toLowerCase().replace(/[_\s]/g, "")

    // Get the appropriate color based on activity type
    const activityType = normalizedType
    const color = colors[activityType] || colors.default

    // For Stand Up Paddling, use a custom paddleboard icon
    if (["standuppaddling", "standuppaddle", "sup", "paddleboard"].includes(activityType)) {
      return L.divIcon({
        html: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="36">
          <!-- Paddleboard with surfboard-like shape -->
          <path fill="#00BFFF" d="M10 4 L14 4 L15 8 L15 18 L13 22 L11 22 L9 18 L9 8 Z" />
          <!-- Paddle -->
          <path fill="#8B4513" d="M17 2 L18 4 L19 6 L19 12 L18 14 L17 14 L16 12 L16 6 Z" />
        </svg>
      `,
        className: "activity-marker",
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36],
      })
    }

    // For Kayaking, use a custom kayak icon
    if (["kayaking", "kayak"].includes(activityType)) {
      return L.divIcon({
        html: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="36">
          <!-- Kayak shape -->
          <path fill="#FF6347" d="M4 12 L20 12 L18 18 L6 18 Z" />
          <!-- Paddle -->
          <path fill="#8B4513" d="M3 8 L7 12 L7 16 L3 20 Z" />
          <path fill="#8B4513" d="M21 8 L17 12 L17 16 L21 20 Z" />
          <!-- Person -->
          <circle fill="#1E90FF" cx="12" cy="6" r="3" />
        </svg>
      `,
        className: "activity-marker",
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36],
      })
    }

    // Create a custom icon using a colored marker for other activity types
    return L.divIcon({
      html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="36">
        <path fill="${color}" d="M12 0C8.5 0 5.7 2.8 5.7 6.3c0 3.1 5.1 13.7 6.3 13.7 1.2 0 6.3-10.6 6.3-13.7C18.3 2.8 15.5 0 12 0z"/>
        <circle fill="white" cx="12" cy="6" r="3"/>
      </svg>
    `,
      className: "activity-marker",
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36],
    })
  }

  // Create a finish icon (black version of the marker)
  function createFinishIcon(L: any) {
    return L.divIcon({
      html: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="36">
          <path fill="#000000" d="M12 0C8.5 0 5.7 2.8 5.7 6.3c0 3.1 5.1 13.7 6.3 13.7 1.2 0 6.3-10.6 6.3-13.7C18.3 2.8 15.5 0 12 0z"/>
          <circle fill="white" cx="12" cy="6" r="3"/>
        </svg>
      `,
      className: "finish-marker",
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36],
    })
  }

  // Create a start icon (green version of the marker)
  function createStartIcon(L: any) {
    return L.divIcon({
      html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="36">
        <path fill="#22c55e" d="M12 0C8.5 0 5.7 2.8 5.7 6.3c0 3.1 5.1 13.7 6.3 13.7 1.2 0 6.3-10.6 6.3-13.7C18.3 2.8 15.5 0 12 0z"/>
        <circle fill="white" cx="12" cy="6" r="3"/>
      </svg>
    `,
      className: "start-marker",
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36],
    })
  }

  // Helper function to get a color for an activity based on its index
  function getColorForIndex(index: number): string {
    const colors = [
      "#FF5733", // Red-Orange
      "#33A8FF", // Blue
      "#33FF57", // Green
      "#FF33A8", // Pink
      "#A833FF", // Purple
      "#FFD433", // Yellow
      "#33FFD4", // Teal
      "#FF8C33", // Orange
      "#3357FF", // Royal Blue
      "#FF3333", // Red
    ]
    return colors[index % colors.length]
  }

  // Effect to render the map when data changes and component is mounted
  useEffect(() => {
    if (isClient && !mapInitialized) {
      renderMap(mapData, rawData, stravaActivity, polyline)
    }
  }, [
    mapData,
    rawData,
    stravaActivity,
    stravaId,
    fetchError,
    polyline,
    activityType,
    activityDate,
    activities,
    isClient,
    mapInitialized,
  ])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {activities && activities.length > 1
            ? `Activity Comparison (${activities.length} activities)`
            : "Activity Map"}
        </CardTitle>
        {stravaId && !stravaActivity && !isFetchingFromStrava && !activities.length && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsFetchingFromStrava(true)
              fetchActivityFromStrava(stravaId)
                .then((data) => {
                  setStravaActivity(data)
                  setFetchError(null)
                })
                .catch((error) => {
                  setFetchError(error.message || "Failed to fetch from Strava")
                })
                .finally(() => {
                  setIsFetchingFromStrava(false)
                })
            }}
          >
            Fetch from Strava
          </Button>
        )}
        {isFetchingFromStrava && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching from Strava...
          </div>
        )}
        {/* Add this new button after the isFetchingFromStrava div */}
        {activities && activities.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (mapInstanceRef.current) {
                // Create bounds to fit all activities
                const L = require("leaflet")
                const bounds = L.latLngBounds([])
                let hasValidData = false

                activities.forEach((activity) => {
                  const polylineData = activity.polyline || findPolyline(activity.map) || ""

                  if (polylineData) {
                    const polylineCoords = decodePolyline(polylineData)
                    if (polylineCoords.length > 0) {
                      hasValidData = true
                      const routeLine = L.polyline(polylineCoords)
                      bounds.extend(routeLine.getBounds())
                    }
                  } else {
                    // Try to extract coordinates as fallback
                    const coordinates = extractCoordinates(activity)
                    if (coordinates.start) {
                      hasValidData = true
                      bounds.extend(coordinates.start)
                      if (coordinates.end) {
                        bounds.extend(coordinates.end)
                      }
                    }
                  }
                })

                // Fit the map to the bounds of all activities
                if (hasValidData) {
                  mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] })
                }
              }
            }}
            className="flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-maximize-2"
            >
              <polyline points="15,3 21,3 21,9"></polyline>
              <polyline points="9,21 3,21 3,15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            Show All
          </Button>
        )}
        {/* Add overview map toggle button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOverviewMap(!showOverviewMap)}
          className="flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-map"
          >
            <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"></polygon>
            <line x1="9" y1="3" x2="9" y2="18"></line>
            <line x1="15" y1="6" x2="15" y2="21"></line>
          </svg>
          {showOverviewMap ? "Hide Overview" : "Show Overview"}
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={mapRef} className="relative h-[400px] w-full rounded-md overflow-hidden" />

        {/* Overview Map */}
        {showOverviewMap && (
          <div className="absolute bottom-4 right-4 w-48 h-32 z-10 bg-white rounded-lg shadow-lg overflow-hidden">
            <div ref={overviewMapRef} className="w-full h-full" />
            <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">Overview</div>
          </div>
        )}

        {/* Activity Legend */}
        {isClient && activities && activities.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Activity Legend</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`flex items-center gap-2 text-sm p-2 rounded transition-colors cursor-pointer ${
                    hoveredActivityId === activity.id
                      ? "bg-blue-100 border border-blue-300 shadow-sm"
                      : "hover:bg-gray-50"
                  }`}
                  onMouseEnter={() => setHoveredActivityId(activity.id)}
                  onMouseLeave={() => setHoveredActivityId(null)}
                  onClick={() => zoomToActivityOnMap(activity.id)}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="24">
                      <path
                        fill={getColorForIndex(index)}
                        d="M12 0C8.5 0 5.7 2.8 5.7 6.3c0 3.1 5.1 13.7 6.3 13.7 1.2 0 6.3-10.6 6.3-13.7C18.3 2.8 15.5 0 12 0z"
                      />
                      <circle fill="white" cx="12" cy="6" r="3" />
                    </svg>
                  </div>
                  <span className={`truncate ${hoveredActivityId === activity.id ? "font-medium" : ""}`}>
                    {activity.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Single Activity Type Legend */}
        {isClient && !activities.length && activityType && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center">
                {activityType.toLowerCase() === "standup_paddling" || activityType.toLowerCase() === "sup" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="24">
                    <path fill="#00BFFF" d="M10 4 L14 4 L15 8 L15 18 L13 22 L11 22 L9 18 L9 8 Z" />
                    <path fill="#8B4513" d="M17 2 L18 4 L19 6 L19 12 L18 14 L17 14 L16 12 L16 6 Z" />
                  </svg>
                ) : activityType.toLowerCase() === "kayaking" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="24">
                    <path fill="#FF6347" d="M4 12 L20 12 L18 18 L6 18 Z" />
                    <path fill="#8B4513" d="M3 8 L7 12 L7 16 L3 20 Z" />
                    <path fill="#8B4513" d="M21 8 L17 12 L17 16 L21 20 Z" />
                    <circle fill="#1E90FF" cx="12" cy="6" r="3" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="24">
                    <path
                      fill={getActivityTypeColor(activityType)}
                      d="M12 0C8.5 0 5.7 2.8 5.7 6.3c0 3.1 5.1 13.7 6.3 13.7 1.2 0 6.3-10.6 6.3-13.7C18.3 2.8 15.5 0 12 0z"
                    />
                    <circle fill="white" cx="12" cy="6" r="3" />
                  </svg>
                )}
              </div>
              <span>{activityType} activity</span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="24">
                  <path
                    fill="#000000"
                    d="M12 0C8.5 0 5.7 2.8 5.7 6.3c0 3.1 5.1 13.7 6.3 13.7 1.2 0 6.3-10.6 6.3-13.7C18.3 2.8 15.5 0 12 0z"
                  />
                  <circle fill="white" cx="12" cy="6" r="3" />
                </svg>
              </div>
              <span>Finish point</span>
            </div>
          </div>
        )}

        {debugInfo && !activities.length && (
          <div className="mt-4 p-2 bg-gray-100 rounded-md text-xs font-mono overflow-auto max-h-[200px]">
            <details>
              <summary className="cursor-pointer font-semibold">Debug Information</summary>
              <pre className="whitespace-pre-wrap">{debugInfo}</pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to get color for activity type
function getActivityTypeColor(type: string): string {
  const colors = {
    run: "#FF0000", // Red
    ride: "#0000FF", // Blue
    swim: "#00FFFF", // Cyan
    hike: "#008000", // Green
    walk: "#00FF00", // Light Green
    default: "#800080", // Purple
  }

  // Normalize the type to lowercase for consistent comparison
  const normalizedType = type?.toLowerCase().replace(/[_\s]/g, "") || "default"

  // Special cases for paddling and kayaking
  if (["standuppaddling", "standuppaddle", "sup", "paddleboard"].includes(normalizedType)) {
    return "#00BFFF" // Deep Sky Blue
  }

  if (["kayaking", "kayak"].includes(normalizedType)) {
    return "#FF6347" // Tomato
  }

  return colors[normalizedType] || colors.default
}
