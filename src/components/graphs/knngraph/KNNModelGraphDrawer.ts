import { Writable } from 'svelte/store';
import { Point3D, Point3DTransformed } from '../../../script/TypingUtils';
import {
  triangles3D,
  cubes3D,
  gridPlanes3D,
  points3D,
  lineStrips3D,
  lines3D,
} from 'd3-3d';
import { gestures } from '../../../script/stores/Stores';

export type GraphDrawConfig = {
  xRot: number;
  yRot: number;
  zRot: number;
  origin: { x: number; y: number };
  scale: number;
};

export type GrahpDrawData = {
  points: Point3D[];
};

const colors = ['red', 'green', 'blue', 'orange'];

class KNNModelGraphDrawer {
  constructor(private svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>) {}

  public draw(drawConfig: GraphDrawConfig, drawData: Point3D[][][]) {
    this.svg.selectAll('*').remove(); // clear svg for redraw

    // Add grid
    this.addGrid(drawConfig);

    // Add axes
    this.addAxis({ x: 1, y: 0, z: 0 }, 'xScale', drawConfig, 'red');
    this.addAxis({ x: 0, y: 1, z: 0 }, 'yScale', drawConfig, 'green');
    this.addAxis({ x: 0, y: 0, z: 1 }, 'zScale', drawConfig, 'blue');

    // Add points
    drawData.forEach((clazz, classIndex) => {
      clazz.forEach((sample, exampleIndex) => {
        sample.forEach((axisValue, axisIndex) => {
          this.addPoint(
            axisValue,
            drawConfig,
            `${classIndex}-${exampleIndex}-${axisIndex}`,
            colors[axisIndex],
            this.getLabel(classIndex)
          );
        });
      });
    });
  }

  /**
   * Adds a single 3D point projected onto the svg.
   */
  private addPoint(
    point: Point3D,
    drawConfig: GraphDrawConfig,
    key: string,
    color: string,
    label?: string
  ) {
    const radius = 3;
    const pointTransformer = this.getPointTransformer(drawConfig);
    const transformedPoint: Point3DTransformed = pointTransformer(point);
    const samplePoint = this.svg
      .selectAll(`circle.points-class-${key}`)
      .data([transformedPoint]);
    samplePoint
      .enter()
      .append('circle')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .merge(samplePoint)
      .attr('class', `d3-3d points-class-${key}`)
      .attr('fill', color)
      .attr('cx', d => {
        return d.projected.x;
      })
      .attr('cy', d => d.projected.y)
      .attr('r', radius);

      if (!label) {
        return;
      }
      const pointLabel = this.svg.selectAll(`span.points-class-${key}`).data([transformedPoint]);
      pointLabel
        .enter()
        .append("text")
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .merge(samplePoint)
        .attr("class",`d3-3d points-class-${key} text-xs`)
        .attr("x", (p) => p.projected.x)
        .attr("y", (p) => p.projected.y)
        .text(label)
  }

  private addAxis(
    direction: Point3D,
    className: string,
    drawConfig: GraphDrawConfig,
    color: string,
  ) {
    const lineLength = 1000;
    const point1: Point3D = {
      x: (-direction.x * lineLength) / 2,
      y: (-direction.y * lineLength) / 2,
      z: (-direction.z * lineLength) / 2,
    };

    const point2: Point3D = {
      x: (direction.x * lineLength) / 2,
      y: (direction.y * lineLength) / 2,
      z: (direction.z * lineLength) / 2,
    };

    const lineTranformer = this.getLineTransformer(drawConfig);
    const lineProjected: Point3DTransformed[] = lineTranformer([[point1, point2]]).points;
    const xScale = this.svg.selectAll('line.' + className).data([lineProjected]);
    xScale
      .enter()
      .append('line')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .merge(xScale)
      .attr('class', 'd3-3d ' + className)
      .attr('x1', (data: Point3DTransformed[]) => data[0].projected.x)
      .attr('y1', (data: Point3DTransformed[]) => data[0].projected.y)
      .attr('x2', (data: Point3DTransformed[]) => data[1].projected.x)
      .attr('y2', (data: Point3DTransformed[]) => data[1].projected.y)
      .attr('stroke', color)
      .attr('stroke-width', 1);
  }

  /**
   * Returns the label by using index to find element in list of gestures
   */
  private getLabel(dataIndex: number) {
    try {
        const gestureList = gestures.getGestures();
        return gestureList[dataIndex].getName()    
    } catch (error) {
        // Index out of bounds indicates either an error or live data.
        return "Live"
    }
}

  private addGrid(drawConfig: GraphDrawConfig) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const grid3d = this.getGridTransformer(drawConfig);
    const xGrid = [];
    const j = 10;
    for (let z = -j; z < j; z++) {
      for (let x = -j; x < j; x++) {
        xGrid.push({ x: x, y: 0, z: z });
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const gridData = grid3d(xGrid);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    const xGridE = this.svg.selectAll('path.grid').data(gridData, (d: any) => d.id);

    xGridE
      .enter()
      .append('path')
      .attr('class', 'd3-3d grid')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .merge(xGridE)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.3)
      .attr('fill', d => '#eee')
      .attr('fill-opacity', 0.9)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      .attr('d', grid3d.draw);
  }

  private getPointTransformer(
    drawConfig: GraphDrawConfig,
  ): (point: Point3D) => Point3DTransformed & { centroid: Point3D } {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    return (_point: Point3D) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      this.getBaseTransformer(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        points3D(),
        drawConfig,
      )([_point as unknown as Point3D[]])[0];
  }

  private getLineTransformer(
    drawConfig: GraphDrawConfig,
  ): (point: Point3D[][]) => { centroid: Point3D; points: Point3DTransformed[] } {
    return (points: Point3D[][]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const transformed = this.getBaseTransformer(lines3D(), drawConfig)(points)[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { centroid, ...transformedPoints } = transformed;
      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        centroid,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        points: transformedPoints,
      };
    };
  }

  private getGridTransformer(drawConfig: GraphDrawConfig) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return gridPlanes3D()
      .rows(20)
      .rotateX(drawConfig.xRot)
      .rotateY(drawConfig.yRot)
      .rotateZ(drawConfig.zRot)
      .origin(drawConfig.origin)
      .scale(drawConfig.scale);
  }

  private getBaseTransformer(
    transformer: any,
    drawConfig: GraphDrawConfig,
  ): (point: Point3D[][]) => any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return transformer
      .rotateX(drawConfig.xRot)
      .rotateY(drawConfig.yRot)
      .rotateZ(drawConfig.zRot)
      .origin(drawConfig.origin)
      .scale(drawConfig.scale) as (point: Point3D[][]) => any;
  }
}

export default KNNModelGraphDrawer;
