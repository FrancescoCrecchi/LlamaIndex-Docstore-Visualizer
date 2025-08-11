export const extractNodes = (docstore) => {
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

export const generateGraphData = (nodesObj, diffInfo) => {
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

export const readFileAsJson = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = JSON.parse(e.target.result);
        resolve(result);
      } catch (err) {
        reject('Invalid JSON file.');
      }
    };
    reader.onerror = () => {
      reject('Failed to read file.');
    };
    reader.readAsText(file);
  });
};

export const getFilteredGraphData = (graphData, nodeTypeFilter) => {
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
