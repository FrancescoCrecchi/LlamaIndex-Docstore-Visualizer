import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// A reusable tooltip component for better React integration
const Tooltip = ({ content, position, isVisible }) => {
  if (!isVisible) return null;
  const style = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '14px',
    pointerEvents: 'none',
    maxWidth: '300px',
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    zIndex: 100,
    transform: 'translate(-50%, -100%)', // Position above the cursor
    marginTop: '-10px'
  };
  return (
    <div style={style} dangerouslySetInnerHTML={{ __html: content }} />
  );
};

const DocstoreGraph = ({ graphData, viewType, nodeTypeFilter }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ isVisible: false, content: '', position: { x: 0, y: 0 } });

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

  useEffect(() => {
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

    // Use filteredGraphData here!
    const { nodes, links } = filteredGraphData;

    // Adjusted width and height for a larger initial view
    const width = 1000;
    const height = 800;

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Create a group element to hold the graph, which will be transformed by the zoom behavior
    const g = svg.append("g");

    // Define the zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .filter(event => {
        // Disable double-click zoom
        return event.type !== 'dblclick';
      })
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(120)) // Slightly increased distance
      .force("charge", d3.forceManyBody().strength(-250)) // Slightly stronger repulsion
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
      .attr("r", 10)
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
    });

  }, [filteredGraphData, viewType, nodeTypeFilter]);

  // useEffect(() => {
  //   // Attach tooltip event handlers to circles
  //   if (!svgRef.current) return;
  //   const svg = d3.select(svgRef.current);
  //   svg.selectAll("circle")
  //     .on("mouseover", (event, d) => {
  //       const status = d.isNew ? 'New' : (d.isDeleted ? 'Deleted' : (d.isModified ? 'Modified' : 'Unchanged'));
  //       let type = d.type === 'document' ? 'Document' : 'Text Node';
  //       let connectedNodesCount = 0;

  //       // If it's a document node, count how many links target it
  //       if (d.type === 'document') {
  //         connectedNodesCount = links.filter(link => link.target.id === d.id).length;
  //         type += ` (Connected Nodes: ${connectedNodesCount})`;
  //       }

  //       const content = `
  //           <strong>ID:</strong> ${d.id}<br/>
  //           <strong>Type:</strong> ${type}<br/>
  //           <strong>Status:</strong> ${status}
  //       `;
  //       setTooltip({ isVisible: true, content, position: { x: event.clientX, y: event.clientY } });
  //     })
  //     .on("mousemove", (event) => {
  //       setTooltip(prev => ({ ...prev, position: { x: event.clientX, y: event.clientY } }));
  //     })
  //     .on("mouseout", () => {
  //       setTooltip({ isVisible: false, content: '', position: { x: 0, y: 0 } });
  //     });
  // }, [filteredGraphData, viewType, nodeTypeFilter]);

  const drag = simulation => {
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

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  return (
    <>
      <div className="w-full h-[600px] bg-gray-50 dark:bg-gray-800 rounded-lg shadow-inner overflow-hidden relative">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
      <Tooltip {...tooltip} />
    </>
  );
};

const App = () => {
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [changes, setChanges] = useState({ added: [], deleted: [], modified: [], unchanged: [] });
  const [beforeGraphData, setBeforeGraphData] = useState(null); // Holds data for the 'before' graph
  const [afterGraphData, setAfterGraphData] = useState(null);   // Holds data for the 'after' graph
  const [currentGraphView, setCurrentGraphView] = useState('after'); // Default to 'after' view
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('graph'); // Default view is graph
  const [nodeTypeFilter, setNodeTypeFilter] = useState(['document', 'text-node']); // Multi-select

  const handleBeforeFileChange = (event) => {
    setBeforeFile(event.target.files[0]);
  };

  const handleAfterFileChange = (event) => {
    setAfterFile(event.target.files[0]);
  };

  const readFileAsJson = (file) => {
    console.log('📖 Reading file:', file.name, 'Size:', file.size, 'bytes');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          console.log('✅ File read successfully, parsing JSON...');
          const result = JSON.parse(e.target.result);
          console.log('✅ JSON parsed successfully');
          resolve(result);
        } catch (err) {
          console.error('❌ JSON parsing failed:', err);
          reject('Invalid JSON file.');
        }
      };
      reader.onerror = () => {
        console.error('❌ File reading failed');
        reject('Failed to read file.');
      };
      reader.readAsText(file);
    });
  };

  const extractNodes = (docstore) => {
    if (!docstore || typeof docstore !== 'object') return {};

    const allExtractedNodes = {};

    // Helper to get the actual node data, handling __data__ nesting
    const getActualData = (node) => node.__data__ || node;

    // Extract nodes from docstore/data
    if (docstore['docstore/data']) {
      for (const id in docstore['docstore/data']) {
        const rawNode = docstore['docstore/data'][id];
        const actualData = getActualData(rawNode);

        allExtractedNodes[id] = {
          ...rawNode,
          __data__: actualData,
          content_hash: actualData.hash || actualData.doc_hash,
          relationships: actualData.relationships,
          ref_doc_id: actualData.ref_doc_id,
          type: actualData.class_name || 'TextNode',
          text: actualData.text,
        };
      }
    }

    // Attach hashes from docstore/metadata
    if (docstore['docstore/metadata']) {
      for (const id in docstore['docstore/metadata']) {
        const meta = docstore['docstore/metadata'][id];
        if (allExtractedNodes[id]) {
          allExtractedNodes[id].doc_hash = meta.doc_hash;
          allExtractedNodes[id].ref_doc_id = meta.ref_doc_id;
          // Prefer doc_hash if not already set
          if (!allExtractedNodes[id].content_hash) {
            allExtractedNodes[id].content_hash = meta.doc_hash;
          }
        } else {
          // If node not in data, create minimal node from metadata
          allExtractedNodes[id] = {
            doc_hash: meta.doc_hash,
            ref_doc_id: meta.ref_doc_id,
            content_hash: meta.doc_hash,
          };
        }
      }
    }

    // Extract document nodes from docstore/ref_doc_info
    if (docstore['docstore/ref_doc_info']) {
      for (const docId in docstore['docstore/ref_doc_info']) {
        const info = docstore['docstore/ref_doc_info'][docId];
        allExtractedNodes[docId] = {
          id: docId,
          type: 'document',
          node_ids: info.node_ids,
          relationships: info.node_ids?.map(nid => ({ node_id: nid })) || [],
          ref_doc_id: docId,
          content_hash: null, // No hash for document node
        };
      }
    }

    return allExtractedNodes;
  };

  const generateGraphData = (nodesObj, diffInfo) => {
    const nodes = Object.entries(nodesObj).map(([id, nodeData]) => {
      const actualData = nodeData.__data__ || nodeData;
      const nodeType = actualData.class_name === 'TextNode' ? 'text-node' : 'document';
      let status = diffInfo?.[id] || 'unchanged';
      // If diffInfo is null, always mark as unchanged
      if (!diffInfo) status = 'unchanged';
      return {
        id,
        type: nodeType,
        isNew: status === 'added',
        isDeleted: status === 'deleted',
        isModified: status === 'modified',
        isUnchanged: status === 'unchanged',
      };
    });

    const links = [];
    for (const node of nodes) {
      const nodeData = nodesObj[node.id];
      const relationships = nodeData.relationships || {};
      for (const relKey in relationships) {
        const rel = relationships[relKey];
        if (rel && rel.node_id && nodesObj[rel.node_id]) {
          links.push({ source: node.id, target: rel.node_id });
        }
      }
    }

    return { nodes, links };
  };

  const analyzeDocstores = async () => {
    console.log('🔍 Starting docstore analysis...');
    if (!beforeFile || !afterFile) {
      setError('Please upload both "Before" and "After" docstore files.');
      return;
    }

    setIsLoading(true);
    setError('');
    setChanges({ added: [], deleted: [], modified: [], unchanged: [] });
    setBeforeGraphData(null);
    setAfterGraphData(null);

    try {
      console.log('📂 Reading JSON files...');
      const beforeNodes = extractNodes(await readFileAsJson(beforeFile));
      const afterNodes = extractNodes(await readFileAsJson(afterFile));

      console.log('📊 Before nodes count:', Object.keys(beforeNodes).length);
      console.log('📊 After nodes count:', Object.keys(afterNodes).length);
      console.log('📋 Before nodes sample:', beforeNodes);
      console.log('📋 After nodes sample:', afterNodes);

      if (Object.keys(beforeNodes).length === 0 && Object.keys(afterNodes).length === 0) {
        throw new Error('Files do not contain a valid docstore format, or no nodes were found.');
      }

      const newChanges = { added: [], deleted: [], modified: [], unchanged: [] };
      const diffInfo = {}; // Maps node ID to its status (added, deleted, modified, unchanged)

      // 1. Process nodes in the 'after' state to identify added, modified, and unchanged
      for (const afterId in afterNodes) {
        const afterNode = afterNodes[afterId];
        const afterHash = afterNode.content_hash;

        if (beforeNodes[afterId]) {
          // Node ID exists in both
          if (beforeNodes[afterId].content_hash === afterHash) {
            // Unchanged
            newChanges.unchanged.push({ id: afterId, ...afterNode });
            diffInfo[afterId] = 'unchanged';
          } else {
            // Modified
            newChanges.modified.push({ id: afterId, before: beforeNodes[afterId], after: afterNode });
            diffInfo[afterId] = 'modified';
          }
        } else {
          // Truly new
          newChanges.added.push({ id: afterId, ...afterNode });
          diffInfo[afterId] = 'added';
        }
      }

      // 2. Process nodes in the 'before' state to identify truly deleted nodes
      for (const beforeId in beforeNodes) {
        if (!afterNodes[beforeId] && !diffInfo[beforeId]) {
          newChanges.deleted.push({ id: beforeId, ...beforeNodes[beforeId] });
          diffInfo[beforeId] = 'deleted';
        }
      }

      console.log('🔄 Analysis complete - Changes found:', {
        added: newChanges.added.length,
        deleted: newChanges.deleted.length,
        modified: newChanges.modified.length,
        unchanged: newChanges.unchanged.length
      });

      setChanges(newChanges);

      // Generate the 'before' graph data (no diffInfo)
      const beforeGraph = generateGraphData(beforeNodes, null);
      setBeforeGraphData(beforeGraph);

      // Generate the 'after' graph data (with diffInfo)
      const afterGraph = generateGraphData(afterNodes, diffInfo);
      setAfterGraphData(afterGraph);

    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(err.toString());
    } finally {
      console.log('✅ Analysis finished');
      setIsLoading(false);
    }
  };

  const NodeTypeFilterBar = ({ nodeTypeFilter, setNodeTypeFilter }) => (
    <div className="flex justify-center items-center space-x-6 mb-8">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={nodeTypeFilter.includes('document')}
          onChange={e => {
            if (e.target.checked) {
              setNodeTypeFilter(prev => [...new Set([...prev, 'document'])]);
            } else {
              setNodeTypeFilter(prev => prev.filter(type => type !== 'document'));
            }
          }}
        />
        <span className="w-4 h-4 rounded-full bg-[#4a90e2] border border-white dark:border-gray-800 inline-block"></span>
        <span>Document</span>
      </label>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={nodeTypeFilter.includes('text-node')}
          onChange={e => {
            if (e.target.checked) {
              setNodeTypeFilter(prev => [...new Set([...prev, 'text-node'])]);
            } else {
              setNodeTypeFilter(prev => prev.filter(type => type !== 'text-node'));
            }
          }}
        />
        <span className="w-4 h-4 rounded-full bg-[#b8b8b8] border border-white dark:border-gray-800 inline-block"></span>
        <span>Text Node</span>
      </label>
    </div>
  );

  const GraphLegendOverlay = () => (
    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col space-y-2 text-sm z-10 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <span className="w-4 h-4 rounded-full bg-[#50e3c2] border border-white dark:border-gray-800"></span>
        <span>New</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="w-4 h-4 rounded-full bg-[#f5a623] border border-white dark:border-gray-800"></span>
        <span>Updated</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="w-4 h-4 rounded-full bg-[#ff4a4a] border border-white dark:border-gray-800"></span>
        <span>Deleted</span>
      </div>
    </div>
  );

  const getFilteredGraphData = graphData => {
    if (!graphData) return null;
    const filteredNodes = graphData.nodes.filter(node =>
      nodeTypeFilter.includes(node.type)
    );
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links.filter(link =>
      filteredNodeIds.has(link.source.id || link.source) &&
      filteredNodeIds.has(link.target.id || link.target)
    );
    return { ...graphData, nodes: filteredNodes, links: filteredLinks };
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 flex flex-col items-center">
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8 font-sans relative">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
            LlamaIndex Docstore Visualizer
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Upload two docstore files to see the changes in nodes.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
            <label htmlFor="beforeFile" className="cursor-pointer">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-json text-blue-400">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M8 12h2" />
                  <path d="M8 16h2" />
                  <path d="m14 12-2 2-2-2" />
                  <path d="m14 16-2-2-2 2" />
                </svg>
                <span className="text-lg font-medium">Before Docstore</span>
              </div>
            </label>
            <input
              id="beforeFile"
              type="file"
              onChange={handleBeforeFileChange}
              accept=".json"
              className="mt-2 p-2 w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300 dark:hover:file:bg-blue-800"
            />
            {beforeFile && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Selected: {beforeFile.name}</p>}
          </div>

          <div className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
            <label htmlFor="afterFile" className="cursor-pointer">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-json text-purple-400">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M8 12h2" />
                  <path d="M8 16h2" />
                  <path d="m14 12-2 2-2-2" />
                  <path d="m14 16-2-2-2 2" />
                </svg>
                <span className="text-lg font-medium">After Docstore</span>
              </div>
            </label>
            <input
              id="afterFile"
              type="file"
              onChange={handleAfterFileChange}
              accept=".json"
              className="mt-2 p-2 w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900 dark:file:text-purple-300 dark:hover:file:bg-purple-800"
            />
            {afterFile && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Selected: {afterFile.name}</p>}
          </div>
        </section>

        <div className="text-center">
          <button
            onClick={analyzeDocstores}
            disabled={isLoading || !beforeFile || !afterFile}
            className={`w-full md:w-auto px-8 py-3 text-white font-bold rounded-full transition-all duration-300 transform shadow-md
            ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-105 active:scale-95'}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 0-9-9V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analyzing...</span>
              </span>
            ) : (
              'Analyze Docstores'
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {(Object.keys(changes.added).length > 0 || Object.keys(changes.deleted).length > 0 || Object.keys(changes.modified).length > 0) && (
          <div className="mt-8">
            <div className="flex justify-center space-x-2 mb-4">
              <button
                onClick={() => setView('diff')}
                className={`px-4 py-2 rounded-full font-bold transition-all ${view === 'diff' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Diff
              </button>
              <button
                onClick={() => setView('graph')}
                className={`px-4 py-2 rounded-full font-bold transition-all ${view === 'graph' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Graph
              </button>
            </div>

            {view === 'diff' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center">
                  Changes Found
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center justify-center p-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle mr-2 opacity-50">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-8.08" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Unchanged: {changes.unchanged.length}
                  </div>
                  <div className="flex items-center justify-center p-3 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle mr-2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-8.08" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Added: {changes.added.length}
                  </div>
                  <div className="flex items-center justify-center p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle mr-2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m15 9-6 6" />
                      <path d="m9 9 6 6" />
                    </svg>
                    Deleted: {changes.deleted.length}
                  </div>
                  <div className="flex items-center justify-center p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw mr-2">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.75 2.25" />
                      <path d="M3 4s.78 2.28 1.5 4" />
                      <path d="M21 20s-.78-2.28-1.5-4" />
                      <path d="M12 21a9 9 0 0 1-9-9 9.75 9.75 0 0 1 6.75-2.25" />
                    </svg>
                    Modified: {changes.modified.length}
                  </div>
                </div>

                <ul className="space-y-4">
                  {changes.unchanged.length > 0 && (
                    <li className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden border border-white-300 dark:border-white-600">
                      <h3 className="flex items-center space-x-2 text-lg font-semibold bg-gray-20 dark:bg-gray-750 text-gray-800 dark:text-gray-200 px-4 py-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw">
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.75 2.25" />
                          <path d="M3 4s.78 2.28 1.5 4" />
                          <path d="M21 20s-.78-2.28-1.5-4" />
                          <path d="M12 21a9 9 0 0 1-9-9 9.75 9.75 0 0 1 6.75-2.25" />
                        </svg>
                        <span>Unchanged Nodes</span>
                      </h3>
                      <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                        {changes.unchanged.map(node => (
                          <li key={node.id} className="p-4">
                            <span className="font-mono text-sm break-all">{node.id}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                  {changes.added.length > 0 && (
                    <li className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden border border-green-300 dark:border-green-600">
                      <h3 className="flex items-center space-x-2 text-lg font-semibold bg-green-50 dark:bg-green-800 text-green-800 dark:text-green-200 px-4 py-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-8.08" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>Added Nodes</span>
                      </h3>
                      <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                        {changes.added.map(node => (
                          <li key={node.id} className="p-4">
                            <span className="font-mono text-sm break-all">{node.id}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                  {changes.modified.length > 0 && (
                    <li className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden border border-yellow-300 dark:border-yellow-600">
                      <h3 className="flex items-center space-x-2 text-lg font-semibold bg-yellow-50 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw">
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.75 2.25" />
                          <path d="M3 4s.78 2.28 1.5 4" />
                          <path d="M21 20s-.78-2.28-1.5-4" />
                          <path d="M12 21a9 9 0 0 1-9-9 9.75 9.75 0 0 1 6.75-2.25" />
                        </svg>
                        <span>Modified Nodes</span>
                      </h3>
                      <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                        {changes.modified.map(node => (
                          <li key={node.id} className="p-4">
                            <span className="font-mono text-sm break-all">{node.id}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                  {changes.deleted.length > 0 && (
                    <li className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden border border-red-300 dark:border-red-600">
                      <h3 className="flex items-center space-x-2 text-lg font-semibold bg-red-50 dark:bg-red-800 text-red-800 dark:text-red-200 px-4 py-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m15 9-6 6" />
                          <path d="m9 9 6 6" />
                        </svg>
                        <span>Deleted Nodes</span>
                      </h3>
                      <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                        {changes.deleted.map(node => (
                          <li key={node.id} className="p-4">
                            <span className="font-mono text-sm break-all">{node.id}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center space-x-4 mb-4">
                  <button
                    onClick={() => setCurrentGraphView('before')}
                    className={`px-4 py-2 rounded-full font-bold transition-all ${currentGraphView === 'before' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                    disabled={!beforeGraphData || beforeGraphData.nodes.length === 0}
                  >
                    View Before Graph
                  </button>
                  <button
                    onClick={() => setCurrentGraphView('after')}
                    className={`px-4 py-2 rounded-full font-bold transition-all ${currentGraphView === 'after' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                    disabled={!afterGraphData || afterGraphData.nodes.length === 0}
                  >
                    View After Graph
                  </button>
                </div>
                <NodeTypeFilterBar nodeTypeFilter={nodeTypeFilter} setNodeTypeFilter={setNodeTypeFilter} />


                {view === 'graph' && (
                  <div className="relative">
                    <GraphLegendOverlay />
                    {currentGraphView === 'before' && beforeGraphData ? (
                      <DocstoreGraph
                        graphData={getFilteredGraphData(beforeGraphData)}
                        viewType={currentGraphView}
                        nodeTypeFilter={nodeTypeFilter}
                      />
                    ) : currentGraphView === 'after' && afterGraphData ? (
                      <DocstoreGraph
                        graphData={getFilteredGraphData(afterGraphData)}
                        viewType={currentGraphView}
                        nodeTypeFilter={nodeTypeFilter}
                      />
                    ) : (
                      <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
                        <p>Upload files and analyze to see the graph visualization.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(!Object.keys(changes.added).length && !Object.keys(changes.deleted).length && !Object.keys(changes.modified).length) && !isLoading && !error && (
          <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
            <p>Upload files and click 'Analyze' to see the changes.</p>
          </div>
        )
        }
      </div>
    </div>
  );
};

export default App;
