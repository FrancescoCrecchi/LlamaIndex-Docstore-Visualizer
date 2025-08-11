import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import Tooltip from './Tooltip';

const DocstoreGraph = ({ graphData, viewType, nodeTypeFilter }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ isVisible: false, content: '', position: { x: 0, y: 0 } });

  useEffect(() => {
    if (!graphData) return;
    const filteredNodes = graphData.nodes.filter(node =>
      nodeTypeFilter.includes(node.type)
    );
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links.filter(link =>
      filteredNodeIds.has(link.source.id || link.source) &&
      filteredNodeIds.has(link.target.id || link.target)
    );
    const filteredGraphData = {
      ...graphData,
      nodes: filteredNodes,
      links: filteredLinks,
    };

    d3.select(svgRef.current).selectAll('*').remove();

    if (!filteredGraphData || !filteredGraphData.nodes || filteredGraphData.nodes.length === 0) {
      d3.select(svgRef.current).append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "18px")
        .attr("fill", "#6b7280")
        .text("No graph data to display. Please analyze docstores with node relationships.");
      return;
    }

    const { nodes, links } = filteredGraphData;
    const width = 1000;
    const height = 800;

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .filter(event => event.type !== 'dblclick')
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id)
        .distance((l) => l.source.type === 'document' || l.target.type === 'document' ? 100 : 30))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value || 1));

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => d.type === 'document' ? 30 : 8)
      .attr("fill", d => {
        if (d.isDeleted) return "#ff4a4a";
        if (d.isNew) return "#50e3c2";
        if (d.isModified) return "#f5a623";
        if (d.type === 'document') return "#4a90e2";
        return "#b8b8b8";
      })
      .call(drag(simulation));

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      // Always fit graph to all nodes on first tick of each render
      if (simulation.tickCount === 1) {
        const xs = nodes.map(d => d.x);
        const ys = nodes.map(d => d.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const padding = 40;
        const boxWidth = maxX - minX + padding * 2;
        const boxHeight = maxY - minY + padding * 2;

        const scale = Math.min(width / boxWidth, height / boxHeight, 1);
        const translateX = width / 2 - scale * (minX + maxX) / 2;
        const translateY = height / 2 - scale * (minY + maxY) / 2;

        svg.call(
          zoom.transform,
          d3.zoomIdentity
            .translate(translateX, translateY)
            .scale(scale)
        );
      }
    });

    // Attach tooltip event handlers to circles
    svg.selectAll("circle")
      .on("mouseover", (event, d) => {
        const status = d.isNew ? 'New' : (d.isDeleted ? 'Deleted' : (d.isModified ? 'Modified' : 'Unchanged'));
        let type = d.type === 'document' ? 'Document' : 'Text Node';
        let connectedNodesCount = 0;

        if (d.type === 'document') {
          connectedNodesCount = links.filter(link => link.target.id === d.id).length;
          type += ` (Connected Nodes: ${connectedNodesCount})`;
        }

        const content = `
            <strong>ID:</strong> ${d.id}<br/>
            <strong>Type:</strong> ${type}<br/>
            <strong>Status:</strong> ${status}
        `;
        setTooltip({ isVisible: true, content, position: { x: event.offsetX, y: event.offsetY } });
      })
      .on("mouseout", () => {
        setTooltip({ isVisible: false, content: '', position: { x: 0, y: 0 } });
      });

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    function drag(simulation) {
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

  }, [graphData, viewType, nodeTypeFilter]);

  return (
    <div className="w-full h-[600px] bg-gray-50 dark:bg-gray-800 rounded-lg shadow-inner overflow-hidden relative border border-gray-200 dark:border-gray-700">
      <svg ref={svgRef} className="w-full h-full"></svg>
      <Tooltip {...tooltip} />
    </div>
  );
};

export default DocstoreGraph;
