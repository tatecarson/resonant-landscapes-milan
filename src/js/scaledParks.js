import * as turf from "@turf/turf";
import stateParks from '../data/stateParks.json';
import buildingPolygons from '../data/buildingPolygons.json';

// Borders for the rectangle on University of Milan Citta Studi campus
const campusWest = 9.226601240285147;
const campusEast = 9.23439159178696;
const campusNorth = 45.47692430838818;
const campusSouth = 45.474261095742385;

// Add a buffer to keep points away from the edges
const buffer = 0.0004; // Adjust this value as needed

// Adjusted borders with buffer
const adjustedWest = campusWest + buffer;
const adjustedEast = campusEast - buffer;
const adjustedNorth = campusNorth - buffer;
const adjustedSouth = campusSouth + buffer;

console.log("Adjusted Borders:", { adjustedWest, adjustedEast, adjustedNorth, adjustedSouth });

// Function to find the bounding box of the original state parks
const findBoundingBox = (parks) => {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    parks.forEach(park => {
        if (park.cords && park.cords.length === 2) {
            const [lon, lat] = park.cords;
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        } else {
            console.error(`Invalid park coordinates: ${JSON.stringify(park)}`);
        }
    });
    return { minLon, maxLon, minLat, maxLat };
};

const originalBounds = findBoundingBox(stateParks);
console.log("Original Bounds:", originalBounds);

// Calculate scale factors using adjusted borders
const lonScale = (adjustedEast - adjustedWest) / (originalBounds.maxLon - originalBounds.minLon);
const latScale = (adjustedNorth - adjustedSouth) / (originalBounds.maxLat - originalBounds.minLat);
console.log("Scale Factors:", { lonScale, latScale });

// Function to check if a point is within any building polygon
const isPointInBuilding = (point) => {
    try {
        return buildingPolygons.features.some(building => {
            return turf.booleanPointInPolygon(point, building);
        });
    } catch (error) {
        console.error(`Error in booleanPointInPolygon: ${error.message}`, point);
        return false;
    }
};

// Function to move a point outside of buildings
const movePointOutsideBuildings = (point) => {
    const step = 0.0003; // Adjust step size as needed
    let movedPoint = point;
    let direction = [step, 0]; // Initial move direction (east)

    while (isPointInBuilding(movedPoint)) {
        const [lon, lat] = movedPoint.geometry.coordinates;
        movedPoint = turf.point([lon + direction[0], lat + direction[1]]);

        // Update direction to move in a circle if still in building
        if (direction[0] !== 0) {
            direction = [0, step]; // Move north
        } else if (direction[1] > 0) {
            direction = [-step, 0]; // Move west
        } else if (direction[1] < 0) {
            direction = [step, 0]; // Move east again
        }
    }

    return movedPoint;
};

// Scale and translate the state park points
const scaledPoints = stateParks.map(park => {
    if (park.cords && park.cords.length === 2) {
        // Original park point
        const originalPoint = turf.point(park.cords);
        
        // Calculate the scaled coordinates
        const scaledLong = adjustedWest + (originalPoint.geometry.coordinates[0] - originalBounds.minLon) * lonScale;
        const scaledLat = adjustedSouth + (originalPoint.geometry.coordinates[1] - originalBounds.minLat) * latScale;
        
        // Create scaled point
        let scaledPoint = turf.point([scaledLong, scaledLat]);

        console.log("Original Point:", originalPoint);
        console.log("Scaled Point:", scaledPoint);

        // Move the point if it falls within a building
        if (isPointInBuilding(scaledPoint)) {
            console.log("Point is in building, moving it:", scaledPoint);
            scaledPoint = movePointOutsideBuildings(scaledPoint);
            console.log("Moved Point:", scaledPoint);
        }
        
        return {
            ...park,
            scaledCoords: scaledPoint.geometry.coordinates
        };
    } else {
        console.error(`Invalid coordinates for park: ${JSON.stringify(park)}`);
        return null; // Or handle the invalid park data as needed
    }
});



export default scaledPoints;
