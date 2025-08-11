import React, { useState } from 'react';
import DocstoreGraph from './components/DocstoreGraph';
import NodeTypeFilterBar from './components/NodeTypeFilterBar';
import GraphLegendOverlay from './components/GraphLegendOverlay';
import {
  extractNodes,
  generateGraphData,
  readFileAsJson,
  getFilteredGraphData
} from './utils/docstoreUtils';

const App = () => {
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [changes, setChanges] = useState({ added: [], deleted: [], modified: [], unchanged: [] });
  const [view, setView] = useState('diff');
  const [beforeGraphData, setBeforeGraphData] = useState(null);
  const [afterGraphData, setAfterGraphData] = useState(null);
  const [currentGraphView, setCurrentGraphView] = useState('after');
  const [nodeTypeFilter, setNodeTypeFilter] = useState(['document', 'text-node']);

  const handleBeforeFileChange = (event) => {
    setBeforeFile(event.target.files[0]);
  };

  const handleAfterFileChange = (event) => {
    setAfterFile(event.target.files[0]);
  };

  const analyzeDocstores = async () => {
    if (!beforeFile || !afterFile) {
      setError('Please upload both "Before" and "After" docstore files.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setChanges({ added: [], deleted: [], modified: [], unchanged: [] });
    setBeforeGraphData(null);
    setAfterGraphData(null);
    try {
      const beforeNodes = extractNodes(await readFileAsJson(beforeFile));
      const afterNodes = extractNodes(await readFileAsJson(afterFile));
      if (Object.keys(beforeNodes).length === 0 && Object.keys(afterNodes).length === 0) {
        throw new Error('Files do not contain a valid docstore format, or no nodes were found.');
      }
      const newChanges = { added: [], deleted: [], modified: [], unchanged: [] };
      const diffInfo = {};
      for (const afterId in afterNodes) {
        const afterNode = afterNodes[afterId];
        const afterHash = afterNode.content_hash;
        if (beforeNodes[afterId]) {
          if (beforeNodes[afterId].content_hash === afterHash) {
            newChanges.unchanged.push({ id: afterId, ...afterNode });
            diffInfo[afterId] = 'unchanged';
          } else {
            newChanges.modified.push({ id: afterId, before: beforeNodes[afterId], after: afterNode });
            diffInfo[afterId] = 'modified';
          }
        } else {
          newChanges.added.push({ id: afterId, ...afterNode });
          diffInfo[afterId] = 'added';
        }
      }
      for (const beforeId in beforeNodes) {
        if (!afterNodes[beforeId] && !diffInfo[beforeId]) {
          newChanges.deleted.push({ id: beforeId, ...beforeNodes[beforeId] });
          diffInfo[beforeId] = 'deleted';
        }
      }
      setChanges(newChanges);
      setBeforeGraphData(generateGraphData(beforeNodes, null));
      setAfterGraphData(generateGraphData(afterNodes, diffInfo));
    } catch (err) {
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center">
      <div className="flex-1 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8 font-sans relative">
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

        {(changes.added.length > 0 || changes.deleted.length > 0 || changes.modified.length > 0) && (
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
                    Unchanged: {changes.unchanged.length}
                  </div>
                  <div className="flex items-center justify-center p-3 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    Added: {changes.added.length}
                  </div>
                  <div className="flex items-center justify-center p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                    Deleted: {changes.deleted.length}
                  </div>
                  <div className="flex items-center justify-center p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                    Modified: {changes.modified.length}
                  </div>
                </div>

                <ul className="space-y-4">
                  {changes.unchanged.length > 0 && (
                    <li className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden border border-white-300 dark:border-white-600">
                      <h3 className="flex items-center space-x-2 text-lg font-semibold bg-gray-20 dark:bg-gray-750 text-gray-800 dark:text-gray-200 px-4 py-3">
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
                        graphData={getFilteredGraphData(beforeGraphData, nodeTypeFilter)}
                        viewType={currentGraphView}
                        nodeTypeFilter={nodeTypeFilter}
                      />
                    ) : currentGraphView === 'after' && afterGraphData ? (
                      <DocstoreGraph
                        graphData={getFilteredGraphData(afterGraphData, nodeTypeFilter)}
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

        {(!changes.added.length && !changes.deleted.length && !changes.modified.length) && !isLoading && !error && (
          <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
            <p>Upload files and click 'Analyze' to see the changes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
