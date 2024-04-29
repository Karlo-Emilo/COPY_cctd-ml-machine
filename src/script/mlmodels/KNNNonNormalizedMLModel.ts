import MLModel from "../domain/MLModel";
import { Point3D } from "../utils/graphUtils";

export type LabelledPoint = {
    classIndex: number
} & Point3D

/**
 * Represents a KNN model, in which points are not normalized and retain their raw values
 */
class KNNNonNormalizedMLModel implements MLModel {

    constructor(private k: number, private noOfClasses: number, private points: LabelledPoint[]) { }

    predict(filteredData: number[]): Promise<number[]> {
        // Transform live-data to Point3D type
        const predictedPoint: Point3D = this.getPredictedPoint(filteredData);

        // Sort points by distance to live-data point
        const orderedPoints = [...this.points]
        orderedPoints.sort((a, b) => {
            const aDist = this.distanceBetween(predictedPoint, a);
            const bDist = this.distanceBetween(predictedPoint, b);
            return aDist - bDist;
        })

        // Find the nearest gesture class indices
        const neighbours = []
        for (let i = 0; i < this.k; i++) {
            const neighbour = orderedPoints[i];
            neighbours.push(neighbour.classIndex);
        }

        // Compute the confidences and create the confidences array.
        const confidences = []
        for (let i = 0; i < this.noOfClasses; i++) {
            confidences.push(neighbours.filter(e => e === i).length / this.k)
        }

        return Promise.resolve(confidences);
    }

    private getPredictedPoint(filteredData: number[]): Point3D {
        return {
            x: filteredData[0],
            y: filteredData[1],
            z: filteredData.length > 2 ? filteredData[2] : 0
        }
    }

    private distanceBetween(point1: Point3D, point2: Point3D) {
        const { x: x1, y: y1, z: z1 } = point1;
        const { x: x2, y: y2, z: z2 } = point2;

        const [dx, dy, dz] = [
            x2 - x1,
            y2 - y1,
            z2 - z1
        ]

        const squaredDistance = dx ** 2 + dy ** 2 + dz ** 2;

        return Math.sqrt(squaredDistance);
    }
}

export default KNNNonNormalizedMLModel;