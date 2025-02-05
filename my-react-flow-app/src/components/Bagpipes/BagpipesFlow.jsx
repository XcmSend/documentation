// @ts-nocheck
// Copyright 2019-2022 @bagpipes/xcm-send author Ramsey Ajram (https://decentration.org)
// SPDX-License-Identifier: Apache-2.0
// @ts-nocheck

import React, { useState, useRef, useCallback , useEffect, memo, useContext,  } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactFlow, { useReactFlow, Panel, MiniMap, Controls, Background, BackgroundVariant, applyNodeChanges, useStoreApi, EdgeLabelRenderer } from 'reactflow';
// import AuthService from '../../services/AuthService';
import { useExecuteChainScenario, useSaveDiagramState } from './hooks';
import useAppStore from '../../store/useAppStore';
import { generateEdgeId } from './utils/storageUtils';
import GitInfo from './git_tag';
import { useDebounce } from 'use-debounce';
import TextUpdaterNode from './TextupdaterNode';
import Toolbar from '../Toolbar/Toolbar';
import FormGroupNode from './FormGroupNode';
import CustomEdge from './CustomEdges/CustomEdge';
import { ChainNode, ActionNode, RouterNode, WebhookNode,WebsocketNode, APINode, HttpNode, CodeNode, ScheduleNode, DiscordNode, OpenAINode } from './CustomNodes';
import RenderNodeForm from './Forms/RenderNodeForm';
import { initialEdges, initialNodes } from './nodes.jsx';
import PlayButton from './buttons/PlayButton';
import StartButton from './buttons/StartButton';
import SendButton from './buttons/SendButton';
import CreateUiButton from './buttons/CreateUiButton';
import { startDraftingProcess } from './utils/startDraftingProcess';
import { calculateTippyPosition } from './utils/canvasUtils';
import { MarkerType } from 'reactflow';
import { useCreateScenario } from './hooks/useCreateScenario';
import CreateTemplateLink from './TemplateFeatures/CreateTemplateLink';
import { v4 as uuidv4 } from 'uuid';
import styled, { ThemeProvider } from 'styled-components';
import { useTippy } from '../../contexts/tooltips/TippyContext';
import ThemeContext from '../../contexts/ThemeContext';
import { lightTheme, darkTheme } from './theme';
import { CreateButton } from './buttons/CreateButton';
import { node } from 'stylis';
import transformOrderedList from '../toasts/utils/transformOrderedList';
import { getOrderedList } from './hooks/utils/scenarioExecutionUtils';
import OrderedListContent from '../toasts/OrderedListContent';
import { onConnect, onEdgesChange, onNodesChange } from '../../store/reactflow/';
import useOnEdgesChange from '../../store/reactflow/useOnEdgesChange';
import Edges from './edges';
import { getNodeConfig } from './nodeConfigs';
import { EDGE_STYLES } from '../../store/reactflow/onConnect';
import TopBar from './TopBar/TopBar';
import './utils/getAllConnectedNodes';


// import 'reactflow/dist/style.css';
// import './node.styles.scss';
import '../../index.css';
import toast  from "react-hot-toast";

const ReactFlowStyled = styled(ReactFlow)`
  background-color: ${(props) => props.theme.bg};
`;
// Make the dark theme a bg-slate-900 style similar to Tailwind website
const ControlsStyled = styled(Controls)`
  button {
    background-color: ${(props) => props.theme.controlsBg};
    color: ${(props) => props.theme.controlsColor};
    border-bottom: 1px solid ${(props) => props.theme.controlsBorder};

    &:hover {
      background-color: ${(props) => props.theme.controlsBgHover};
    }

    path {
      fill: currentColor;
    }
  }
`;

const MIN_DISTANCE = 300;
let id = 0;
const proOptions = { hideAttribution: true };
const nodeTypes = { 
  textUpdater: TextUpdaterNode, 
  formGroup: FormGroupNode,
  
  chain: ChainNode,
  action: ActionNode,
  router: RouterNode,
  webhook: WebhookNode,
  websocket: WebsocketNode,
  api: APINode,
  http: HttpNode,
  code: CodeNode,
  schedule: ScheduleNode,
  discord: DiscordNode,
  delay: DelayNode,
  openAi: OpenAINode,
};

const edgeTypes = {
    custom: CustomEdge,
    // 'start-end': CustomEdgeStartEnd,
  };

const getId = (nodeType) => `${nodeType}_${uuidv4().substr(0, 6)}`;

const BagpipesFlow = () => {

  const reactFlowWrapper = useRef(null);
  const { showTippy, tippyProps } = useTippy();

    const { scenarios, activeScenarioId, addScenario, setActiveScenarioId, saveScenario, saveDiagramData, addNodeToScenario, addEdgeToScenario, deleteNodeFromScenario, deleteEdgeFromScenario, updateNodePositionInScenario, updateNodesInScenario, setSelectedNodeInScenario, setSelectedEdgeInScenario, nodeConnections, setNodes, setEdges, setNodeConnections, tempEdge, setTempEdge, loading, transactions, setTransactions, shouldExecuteChainScenario, toggleExecuteChainScenario, executionId, setExecutionState, setToastPosition } = useAppStore(state => ({
      scenarios: state.scenarios,
      activeScenarioId: state.activeScenarioId,
      addScenario: state.addScenario,
      setActiveScenarioId: state.setActiveScenarioId,
      saveScenario: state.saveScenario,
      saveDiagramData: state.saveDiagramData,
      addNodeToScenario: state.addNodeToScenario,
      addEdgeToScenario: state.addEdgeToScenario,
      deleteNodeFromScenario: state.deleteNodeFromScenario,
      deleteEdgeFromScenario: state.deleteEdgeFromScenario,
      updateNodePositionInScenario: state.updateNodePositionInScenario,
      updateNodesInScenario: state.updateNodesInScenario,
      setSelectedNodeInScenario: state.setSelectedNodeInScenario,
      setSelectedEdgeInScenario: state.setSelectedEdgeInScenario,
      nodeConnections: state.nodeConnections,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      setNodeConnections: state.setNodeConnections,
      setTempEdge: state.setTempEdge,
      tempEdge: state.tempEdge,
      loading: state.loading,
      transactions: state.transactions,
      setTransactions: state.setTransactions,
      shouldExecuteChainScenario: state.shouldExecuteChainScenario,
      toggleExecuteChainScenario: state.toggleExecuteChainScenario,
      executionId: state.executionId,
      setExecutionState: state.setExecutionState,
      setToastPosition: state.setToastPosition,

    }));
    const store = useStoreApi();
    const currentScenarioNodes = scenarios[activeScenarioId]?.diagramData?.nodes || [];
    const currentScenarioEdges = scenarios[activeScenarioId]?.diagramData?.edges || [];


    const navigate = useNavigate(); 
    const location = useLocation();
    // const [mode, setMode] = useState('light');
    // console.log("  from useUndoRedo:",  );
    const { theme: appTheme, setTheme: setAppTheme } = useContext(ThemeContext);
    const theme = appTheme === 'light' ? lightTheme : darkTheme;
    

    const [modalNodeId, setModalNodeId] = useState(null);
    // const [nodeConnections, setNodeConnections] = useState({});
    // const [nodes, setNodes] = useNodesState([]);
    // const [edges, setEdges] = useEdgesState([]);

    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [inputVariablesByEdgeId, setInputVariablesByEdgeId] = useState({});
    const [maxNodeId, setMaxNodeId] = useState(0);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const instance = useReactFlow();

    const { executeChainScenario, nodeContentMap, stopExecution } = useExecuteChainScenario(currentScenarioNodes, setNodes, instance);

    const createScenario = useCreateScenario();


    // // Related to proximity connections 
    // const [tempEdges, setTempEdges] = useState([]);
  const combinedEdges = [...currentScenarioEdges, tempEdge].filter(Boolean);

    // const { cut, copy, paste, bufferedNodes } = useCopyPaste(); // causing paste to not work at all
    useSaveDiagramState(currentScenarioNodes, currentScenarioEdges);

    // console.log('before can copy', currentScenarioNodes);
    if (typeof currentScenarioNodes === 'function') {
      console.error("nodes is a function:", currentScenarioNodes);
      // currentScenarioNodes = [];
    }
    const canCopy = currentScenarioNodes.some(({ selected }) => selected);
    // const canPaste = bufferedNodes.length > 0;
      const toggleMode = () => {
        setMode((m) => (m === 'light' ? 'dark' : 'light'));
      };

      const saveState = useCallback(() => {
        const diagramData = {
          nodes: currentScenarioNodes,
          edges: currentScenarioEdges,
        };
    
        // console.log("Saving State:", diagramData); 

        // Save the diagram data to local storage
        localStorage.setItem('diagramData', JSON.stringify(diagramData));
      }, [currentScenarioNodes, currentScenarioEdges]);



      // useEffect(() => {
      //     nodes.forEach(node => {
      //         const formData = getFormDataForNode(node);  // You'll need to implement getFormDataForNode
      //         saveNodeFormData(node.id, formData);
      //     });
      // }, [nodes]);
    
      useEffect(() => {
        
        // Load diagram data from local storage
        const storedDiagramData = localStorage.getItem('diagramData');
        // console.log('stored diagram data', storedDiagramData)
        if (storedDiagramData) {
          const { nodes, edges } = JSON.parse(storedDiagramData);
    
          setNodes(nodes);
          setEdges(edges);
        }
      }, []);

      useEffect(() => {
        // console.log("Active Scenario ID in Bagpipes:", activeScenarioId);
      }, [activeScenarioId]);

      useEffect(() => {
        // Check if there's an active scenario when the component mounts
        if (activeScenarioId === null) {
          // console.log('No active scenario. Redirecting to Lab.');
          navigate('/builder');
        }
      }, []); 
    

      useEffect(() => {
        setNodes(nodes =>
          nodes.map((node) => {
            if (node.type === 'openAi') {
              return {
                ...node,
                data: {
                  ...node.data,
                  nodeContent: nodeContentMap[node.id] || "",
                },
              };
            }
            return node;
          })
        );
      }, [nodeContentMap]);
      
      useEffect(() => {
        const maxIdInNodes = Math.max(...currentScenarioNodes.map(node => parseInt(node.id)), maxNodeId);
        if(maxIdInNodes > maxNodeId) {
          setMaxNodeId(maxIdInNodes);
        }
      }, [currentScenarioNodes]);
      
    
    
    // Load the scenario data when the component mounts
    useEffect(() => {
      if (activeScenarioId) {
          const currentScenario = scenarios[activeScenarioId];
          if (currentScenario && currentScenario.diagramData) {
            // console.log('currentScenario.diagramData hook in Bagpipes', currentScenario.diagramData)
              // Set the nodes and edges from the current scenario
              const { nodes: newNodes, edges: newEdges } = currentScenario.diagramData;
              setNodes(newNodes);
              setEdges(newEdges);
          }
      }
  }, [activeScenarioId]);
  

    
    const getAllConnectedNodes = (nodeId, currentScenarioEdges, connectedNodes = []) => {
        const directConnections = currentScenarioEdges.filter(edge => edge.target === nodeId);
        
        directConnections.forEach(connection => {
          if (!connectedNodes.includes(connection.source)) {
            connectedNodes.push(connection.source);
            getAllConnectedNodes(connection.source, currentScenarioEdges, connectedNodes);
          }
        });
      
        return connectedNodes;
      };
    

  
  
          /**
     * Callback function that gets triggered when the nodes state changes.
     * @param changes {object} - Contains the changes made to the node state.
     */
          const onNodesChange = useCallback((changes) => {
            // console.log("Active Scenario ID:", activeScenarioId);
            // console.log("Changes received:", changes); // Add this line to log changes
          
            if (!Array.isArray(changes)) {
              console.error("Changes should be an array but received:", changes);
              return;
            }
          
             
       
            // Use the Zustand action instead
            setNodes((prevNodes) => {
            const updatedNodes = applyNodeChanges(changes, prevNodes);
            
              // Update the nodes in the current scenario
              updateNodesInScenario(activeScenarioId, updatedNodes);
          
              return updatedNodes;
            });
          }, [  activeScenarioId]);

          
    
    const handleEdgesChange = onEdgesChange(setEdges, setInputVariablesByEdgeId, inputVariablesByEdgeId, activeScenarioId, addEdgeToScenario, scenarios,  );
    // const handleEdgesChange = useOnEdgesChange(appStore.setState, appStore.getState, setInputVariablesByEdgeId, inputVariablesByEdgeId, handleEdgesOperation, activeScenarioId,  );

    const handleConnect = (params) => {
      onConnect(currentScenarioEdges, nodeConnections, setEdges, setNodeConnections, activeScenarioId, addEdgeToScenario)(params);
    };
        
      /**
     * Function to get the closest edge to a node.
     * @param node {object} - The node to get the closest edge for.
     * @returns {object} - Returns an object containing the id, source, and target of the closest edge.
     */
    const getClosestEdge = useCallback((node) => {
      const { nodeInternals } = store.getState();
      const storeNodes = Array.from(nodeInternals.values());
  
      const closestNode = storeNodes.reduce(
        (res, n) => {
          if (n.id !== node.id) {
            const dx = n.positionAbsolute.x - node.positionAbsolute.x;
            const dy = n.positionAbsolute.y - node.positionAbsolute.y;
            // Adjust these factors to tweak the preference for horizontal vs. vertical
            const horizontalFactor = 0.5; // less than 1, to give preference to horizontal connections
            const verticalFactor = 1.5; // more than 1, to make vertical connections less likely
            const d = Math.sqrt((dx * dx * horizontalFactor) + (dy * dy * verticalFactor));
      
            if (d < res.distance && d < MIN_DISTANCE) {
              res.distance = d;
              res.node = n;
            }
          }
      
          return res;
        },
        {
          distance: Number.MAX_VALUE,
          node: null,
        }
      );

      if (!closestNode.node) {
        return null;
      }
      
  
      const closeNodeIsSource = closestNode.node.positionAbsolute.x < node.positionAbsolute.x;
  
      // console.log("Closest node found:", closestNode.node);
      console.log("Resulting edge:", {
        id: `${node.id}-${closestNode.node.id}`,
        source: closeNodeIsSource ? closestNode.node.id : node.id,
        target: closeNodeIsSource ? node.id : closestNode.node.id,
      });
    
      return {
        id: `${node.id}-${closestNode.node.id}`,
        source: closeNodeIsSource ? closestNode.node.id : node.id,
        target: closeNodeIsSource ? node.id : closestNode.node.id,
      };
    }, []);
  
      /**
     * Function that is called when a node is dragged. It computes the closest edge to the dragged node.
     * @param _ {object} - Contains event related data.
     * @param node {object} - The node being dragged.
     */
      const onNodeDrag = useCallback(
        (_, node) => {
          // console.log("Node being dragged:", node);
          const closeEdge = getClosestEdge(node);
           
      
          if (closeEdge && !currentScenarioEdges.some(e =>
              (e.source === closeEdge.source && e.target === closeEdge.target) ||
              (e.source === closeEdge.target && e.target === closeEdge.source)
            )) {
            // Add the temporary edge with 'temp' className
            closeEdge.className = 'temp';
            // setEdges(currentEdges => [...currentEdges, closeEdge]);
            setTempEdge(closeEdge);
            // console.log("Added temp edge:", closeEdge);
          } 

          // Update Tippy position if it's visible and associated with the current node
          if (tippyProps.visible && tippyProps.nodeId === node.id) {
            const newTippyPosition = calculateTippyPosition(node, reactFlowInstance);
            showTippy(null, node.id, newTippyPosition, tippyProps.content);
                }
      
          // Existing logic for updating node position in the scenario
          updateNodePositionInScenario(activeScenarioId, node.id, node.position);
          // console.log("Updating node position:", activeScenarioId, node.id, node.position);
        },
        [getClosestEdge, currentScenarioEdges,   updateNodePositionInScenario, activeScenarioId, tippyProps, showTippy]
      );
      

      const onZoomOrPan = useCallback(() => {
        if (reactFlowInstance && tippyProps.visible && tippyProps.nodeId) {
          const node = reactFlowInstance.getNode(tippyProps.nodeId);
          if (node) {
            const newTippyPosition = calculateTippyPosition(node, reactFlowInstance);
            showTippy(null, node.id, newTippyPosition, tippyProps.content);
          }
        }
      }, [reactFlowInstance, tippyProps, showTippy]);
      
      
  
      const onNodeDragStop = useCallback(
        (_, node) => {
          const closeEdge = getClosestEdge(node);
           
      
          setEdges(prevEdges => {
            // Remove any temp edges from the list
            const connectedEdges = prevEdges.filter(e => e.className !== 'temp');
      
            // If there's a close edge and it's not already connected, add it
            if (closeEdge && !connectedEdges.some(ne =>
                (ne.source === closeEdge.source && ne.target === closeEdge.target) ||
                (ne.source === closeEdge.target && ne.target === closeEdge.source)
              )) {
              const connectedEdge = { 
                ...closeEdge, 
                id: generateEdgeId(closeEdge.source, closeEdge.target), // Ensure consistent id
                className: undefined, // Remove the 'temp' className
                ...EDGE_STYLES.default_connected,
              }; 
              console.log("Connected edge added:", connectedEdge);
              connectedEdges.push(connectedEdge);
              
              // console.log("Connected edge added:", connectedEdge);
              // Call the action to add the edge to the current scenario
              addEdgeToScenario(activeScenarioId, connectedEdge);
            } 
            
            // Return the new edges list
            return connectedEdges;
          });
      
          // Always clear the temp edge after the drag stop
          setTempEdge(null);
      
        },
        [getClosestEdge,   activeScenarioId, addEdgeToScenario]
      );
      
    
    

      /**
     * Function to prevent default behavior when something is being dragged over the drop area.
     * @param event {object} - The event data.
     */
    const onDragOver = useCallback((event) => {
         
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }, [ ]);

    /**
     * Function that handles when something is dropped into the react flow area. 
     * It adds a new node of the dropped type to the nodes state at the position of the drop event.
     * @param event {object} - The event data.
     */
        const onDrop = useCallback(
        (event) => {
            event.preventDefault();
             
            // The type of the node is determined based on what was dragged and dropped.
            const type = event.dataTransfer.getData('application/reactflow');
    
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        
            if (typeof type === 'undefined' || !type) {
            return;
            }
        
            const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
            });

            const newNode = getNodeConfig(type, position, getId);

  
            addNodeToScenario(activeScenarioId, newNode);
        },
        [reactFlowInstance,   activeScenarioId, addNodeToScenario]
    );

    const onNodesDelete = useCallback(() => {
      // 👇 allow deleting nodes undoable
       
    
      // Gather IDs of selected nodes
      const nodeIdsToDelete = currentScenarioNodes.filter(node => node.selected).map(node => node.id);
      console.log("[onNodesDelete] Selected nodes for deletion:", nodeIdsToDelete);

    
      // Delete selected nodes from the state
      setNodes((prevNodes) => prevNodes.filter(node => !node.selected));
    
      // Call the action to delete the nodes from the current scenario
      deleteNodeFromScenario(activeScenarioId, nodeIdsToDelete);

      // Clear the selected node ID if it's among the deleted nodes
      if (nodeIdsToDelete.includes(selectedNodeId)) {
        setSelectedNodeId(null);
      }
    }, [  setNodes, deleteNodeFromScenario, activeScenarioId]);
   
    
    const onEdgesDelete = useCallback(() => {
      // Similar to nodes, take a snapshot for undo functionality (assuming you have it for edges too)
       
  
      // Check if an edge is selected
      if (!selectedEdgeId) {
          console.warn('No edge selected for deletion.');
          return;
      }
  
      // Call the action to delete the edge from the current scenario
      deleteEdgeFromScenario(activeScenarioId, selectedEdgeId);
  
      // Clear the selected edge ID from the local state
      setSelectedEdgeId(null);
  }, [  setSelectedEdgeId, deleteEdgeFromScenario, activeScenarioId, selectedEdgeId]);
  
    const onEdgeClick = useCallback((event, edge) => {
      if (selectedEdgeId === edge.id) {
          setSelectedEdgeId(null); // deselect if the same edge is clicked again
          setSelectedEdgeInScenario(activeScenarioId, null); // update scenario state
      } else {
          setSelectedEdgeId(edge.id); // select the edge
          setSelectedEdgeInScenario(activeScenarioId, edge.id); // update scenario state
      }

      
    }, [selectedEdgeId, setSelectedEdgeInScenario, activeScenarioId]);
    
    const onNodeClick = useCallback((event, node) => {
      console.log("onNodeClick Clicked on:", node);

      if (selectedNodeId === node.id) {
          setSelectedNodeId(null); // deselect if the same node is clicked again
          setSelectedNodeInScenario(activeScenarioId, null); // update scenario state
      } else {
          setSelectedNodeId(node.id); // select the node
          setSelectedNodeInScenario(activeScenarioId, node.id); // update scenario state
      }
  
      const connectedNodes = getAllConnectedNodes(currentScenarioNodes.id, currentScenarioEdges);
      console.log('All connected nodes:', connectedNodes);
  
      if (['openAi', 'formGroup', 'chain'].includes(node.type)) {
          setModalNodeId(node.id);
          // console.log('modalNodeId:', node.id); 
      }
    }, [selectedNodeId, setSelectedNodeInScenario, activeScenarioId]);
    
  // Helper function outside of main function
  const isActionDataComplete = (node) => {
    if (!node.formData || !node.formData.actionData) return false;

    const { source, target } = node.formData.actionData;

    if (!source || !target) return false;

    const isSourceComplete = source.chain && source.assetId !== undefined && source.address && source.amount && source.amount.trim() !== "";

    // Debugging logs:
    console.log(`isActionDataComplete source.amount: ${source.amount}`);
    console.log(`isActionDataComplete Trimmed source.amount: ${source.amount && source.amount.trim()}`);
    console.log(`isActionDataComplete isSourceComplete: ${isSourceComplete}`);

    const isTargetComplete = target.chain && target.assetId !== undefined && target.address;

    return isSourceComplete && isTargetComplete;
};

  // If there's no active scenario, create a new one using the useCreateScenario hook
  if (!activeScenarioId || !scenarios[activeScenarioId]) {
    const createScenario = useCreateScenario();
    createScenario(); // Create a new scenario 
  }

const diagramData = scenarios[activeScenarioId].diagramData;
const orderedList = getOrderedList(diagramData.edges);
const transformedList = transformOrderedList(orderedList, scenarios[activeScenarioId]?.diagramData?.nodes);

const processDraftTransactions = async () => {
  const actionNodes = scenarios[activeScenarioId]?.diagramData?.nodes?.filter(node => node.type === 'action');
  
  if (!actionNodes || actionNodes.length === 0) {
      throw new Error('No action nodes found.');
  }

  if (actionNodes.some(node => !isActionDataComplete(node))) {
      throw new Error('Incomplete data in some action nodes. Please review and complete all fields.');
  }

  // Start the drafting process and return a promise that either resolves with the transactions
  // or rejects after a timeout.
  return new Promise(async (resolve, reject) => {
     const timeoutId = setTimeout(() => {
           reject(new Error('Drafting is taking longer than expected. Please refresh the page and try again.'));
       }, 10000); // 10 seconds timeout

      try {
          const result = await startDraftingProcess(activeScenarioId, scenarios);
          clearTimeout(timeoutId); // Clear the timeout if drafting succeeds in time
          resolve(result);
      } catch (error) {
          clearTimeout(timeoutId); // Clear the timeout if there's an error
          reject(error);
      }
  });
};


const handleDraftTransactions = async () => {
  toast(<OrderedListContent list={transformedList} />);

  try {
      const promise = processDraftTransactions();

      toast.promise(
          promise,
          {
              loading: 'Processing draft transactions...',
              success: 'Draft transactions processed successfully',
              error: (error) => error.message
          },
          {
              style: {
                  minWidth: '250px',
                  zIndex: 100000,
              },
              position: 'top-center',
              loading: {
                  icon: '💥',
                  className: 'node-notifications'
              },
              success: {
                duration: 5000,
                icon: '🔥',
            },
            error: {
                duration: null,  // This will make the error toast persistent.
                icon: '❌',
                // Here's how you can add a button to the toast:
                render({ icon, message }) {
                    return (
                        <div>
                            {icon} {message}
                            <button onClick={() => window.location.reload()}>Refresh</button>
                        </div>
                    );
                },
            }
          }
      );

      const draftedTransactions = await promise;
      setTransactions(draftedTransactions);
      navigate('/transaction/review');
  } catch (error) {
      console.error("Error during transaction drafting:", error);
  }
};


  
   

  // useEffect(() => {
  //   console.log('useEffect running due to location change');

  //   if (debouncedLocationState && debouncedLocationState.executeScenario) {
  //     const executeMyScenario = executeChainScenario();

  //     toast.promise(executeMyScenario,
  //        {
  //          loading: 'Processing workflow...',
  //          success: <b>Workflow success!</b>,
  //          error: <b>Could not execute.</b>,
  //        },
         
  //        {
  //        success: {
  //         duration: 30000,
  //         icon: '🔥',
  //       },
  //       loading: {
  //         duration: 50000,
  //         icon: '⏳',
  //       }
  //     }
  //      );
      
  //     // Reset the executeScenario flag in the location state
  //     // navigate('/builder', { state: { ...location.state, executeScenario: false } });

  //   }
  // }, [debouncedLocationState]);

  // useEffect(() => {
  //   if (shouldExecuteChainScenario) {
  //     console.log("Running executeChainScenario due to shouldExecuteChainScenario being true");

  //     executeChainScenario();
  //     toggleExecuteChainScenario(); 
  //   }
  // }, []);

  async function handleExecuteChainScenario(instance) {
    console.log("Running executeChainScenario due to executionState being 'idle'");
    setExecutionState('sending');
    try {
        await executeChainScenario(instance);
    } catch (error) {
        console.error("An error occurred during scenario execution:", error);
    } finally {
        setExecutionState('idle');
    }
}

// const MAX_TIME = 10
// setTimeout(() => {
//   setExecutionState('idle');
// }, MAX_TIME);


        
    return (

      <div className="bagpipes" >


        <ThemeProvider theme={theme}>
            <Panel position="top-center">   
            {/* <CreateTemplateLink scenarioId={activeScenarioId} /> */}
       
            </Panel>
        
            <div className="" ref={reactFlowWrapper}>
              <ReactFlowStyled
                  nodes={currentScenarioNodes}
                  edges={combinedEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onConnect={handleConnect}
                  onMoveEnd={onZoomOrPan}
                  onZoomEnd={onZoomOrPan}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeDrag={onNodeDrag}
                  onNodeDragStop={onNodeDragStop}
                  onNodesDelete={onNodesDelete}
                  onEdgesDelete={onEdgesDelete}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  attributionPosition="top-right"
                  onNodeClick={onNodeClick} 
                  onEdgeClick={onEdgeClick}
                  proOptions={proOptions}
                  fitView
              >
                
              <Controls />
              
              {/* <MiniMap /> */}
              {/* <Background id="1" gap={10} color="#f1f1f1" variant={BackgroundVariant.Lines} /> 
             <Background id="2" gap={100} offset={1} color="#ccc" variant={BackgroundVariant.Lines} />  */}
              <Background color={theme.dots} className={theme.bg === lightTheme.bg ? "bagpipes-bg" : "bagpipes-bg-dark"} variant={BackgroundVariant.Dots} />
              <ControlsStyled />
              <EdgeLabelRenderer type='' />
              {/* <Panel position="bottom-center">
                <div className={styles.buttonGroup}>
                <button disabled={canUndo} className={styles.button} onClick={undo}>
                    <span className={styles.buttonIcon}>⤴️</span> undo
                </button>
                <button disabled={canRedo} className={styles.button} onClick={redo}>
                    redo <span className={styles.buttonIcon}>⤵️</span>
                </button>
                </div>

            </Panel> */}

            

          
            <TopBar createScenario={createScenario} handleExecuteChainScenario={handleExecuteChainScenario} handleDraftTransactions={handleDraftTransactions} shouldExecuteChainScenario={shouldExecuteChainScenario} />
            <Toolbar />
            </ReactFlowStyled>
            
           
        
            {/* <PlayButton executeScenario={executeChainScenario} stopExecution={stopExecution} disabled={loading} /> */}
             
            {/* <GitInfo /> */}

      

            </div>
            <div className='absolute top-0 right-0 flex justify between'>
            {/* {modalNodeId && currentScenarioNodes && currentScenarioEdges && (
          <RenderNodeForm
            visible={Boolean(modalNodeId)}
            nodeId={modalNodeId}
            nodes={currentScenarioNodes}
            edges={currentScenarioEdges}
            setNodes={setNodes}
            setEdges={setEdges}
            onNodesChange={onNodesChange}
            setModalNodeId={setModalNodeId}
          />
      )} */}
              </div>
    </ThemeProvider>
   
    
    </div>

    );
  }
  
  export default BagpipesFlow;
  