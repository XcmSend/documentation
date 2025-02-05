import React, { useState, useEffect } from 'react';
import { Collapse, Input, Button, Select, Radio } from 'antd';
import Toggle from '../Toggle';
import ItemField from './ItemField'; // Assuming ItemField is in the same directory
import { CustomExpandIcon } from './CustomExpandIcon'; // Assuming CustomExpandIcon is in the same directory
import { PlusIcon } from '../../../Icons/icons';
import { usePanelTippy } from '../../../../contexts/tooltips/TippyContext';
import PanelForm from '../PopupForms/Panel/PanelForm';
import { v4 as uuidv4 } from 'uuid';
import { useDrop, useDrag } from 'react-dnd';
import CustomInput from './CustomInput';
import 'antd/dist/antd.css';
import './Fields.scss';


const { Option } = Select;







const CollapsibleField = ({ nodeId, title, info, toggleTitle, hasToggle,fieldTypes, items, selectOptions=[], selectRadioOptions=[], children, value, onChange }) => {
  const [isToggled, setIsToggled] = useState(false);
  const { showPanelTippy } = usePanelTippy();
  const [droppedItems, setDroppedItems] = useState([]);
  const [pills, setPills] = useState([]);
  const [editableContent, setEditableContent] = useState("");
 
  const [{ isOver }, drop] = useDrop({
    accept: 'NODE',
    drop: (item, monitor) => {
      if (monitor.isOver({ shallow: true })) {
        const newPill = { id: item.id, text: item.label, color: 'your-color' }; // Customize as needed
        setPills(currentPills => [...currentPills, newPill]);
      }
    },
    collect: monitor => ({
      isOver: !!monitor.isOver({ shallow: true }),
    }),
  });

  const DroppedItem = ({ item, onRemove }) => {
    const [, drag] = useDrag({
      type: 'NODE',
      item: item,
    });
  
    return (
      <span 
        ref={drag} 
        style={{ cursor: 'pointer', backgroundColor: 'red', margin: '0 4px' }} 
        onClick={onRemove}
      >
        {item.label} 
      </span>
    );
  };

  const handleInputClick = (event, nodeId) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const parentTippyOffset = 0; 
    const calculatedPosition = {
      x: rect.right + parentTippyOffset,
      y: rect.top
    };
    showPanelTippy( nodeId, calculatedPosition, <PanelForm nodeId={nodeId} />);
    event.stopPropagation();
  };

  const handleToggleChange = (toggled) => {
    setIsToggled(toggled);
  };

  const deleteItem = (itemToDelete) => {
    setItems(items.filter(item => item !== itemToDelete));
  };

  const generateUniqueId = () => {
    // Generate a random number and truncate it to 5 digits
    const id = uuidv4().split('-')[0].substring(0, 4);
    const item = "item_";
    return item.concat(id);
  };
  
 

  useEffect(() => {
    console.log('Toggled state is now:', isToggled);
  }, [isToggled]);

  useEffect(() => {
  }, [items]);

  useEffect(() => {
    // Update the editableContent based on the external 'value'
    // This might involve parsing the value if it's a string combining pills and text
    setEditableContent(value);
  }, [value]);

      // Function to insert a pill into the content editable div
      const insertPill = (pill) => {
        const newContent = editableContent + `<span class="pill" style="background-color: ${pill.color}">${pill.text}</span>`;
        setEditableContent(newContent);
        onChange(newContent);
      };



  const handleItemDropped = (item) => {
    insertPill(item); // Add the pill representation to the editable area
  };

  const renderDroppedItems = () => {
    return droppedItems.map((item, index) => (
      <DroppedItem key={index} item={item} onRemove={() => removeItem(index)} />
    ));
  };


  const renderContent = () => {
    let content;

    // Handle the toggle condition
    if (isToggled) {
      return (
         <CustomInput 
              value={value}
              onChange={onChange}
              onClick={(e) => handleInputClick(e, nodeId)} // If needed
              placeholder={info}
              className='custom-input'
              pills={pills}
              setPills={setPills}
            />
      )
    }
  
    // Dynamic field type rendering based on the fieldType prop
    switch (fieldTypes) {
        case 'input':
            content = (
              <CustomInput 
              value={value}
              onChange={onChange}
              onClick={(e) => handleInputClick(e, nodeId)} // If needed
              placeholder={info}
              className='custom-input'
              pills={pills}
              setPills={setPills}
            />
            );

        break;
        case 'select':
          content = (
            <Select
              onChange={value => onChange(value)}
              getPopupContainer={trigger => trigger.parentNode}

              value={value} 
              className='w-full font-semibold custom-select'
              placeholder="Select option"
            >
              {selectOptions.map((option, index) => (
                <Option key={index} value={option.value}>{option.label}</Option>
              ))}
            </Select>
          );
          break;
      case 'radio':
        // Check if selectRadioOptions is provided, else default to Yes/No
        // if (selectRadioOptions && selectRadioOptions.length > 0) {
          content = (
            <Radio.Group
            onChange={e => onChange(e.target.value)} // Add onChange handler
            value={value}
            buttonStyle="solid"
           
          >
            {selectRadioOptions && selectRadioOptions.length > 0 ? (
              selectRadioOptions.map((option, index) => (
                <Radio key={index} value={option.value}>{option.label}</Radio>
              ))
            ) : (
              <>
                <Radio value="yes">Yes</Radio>
                <Radio value="no">No</Radio>
              </>
            )}
          </Radio.Group>
          
          );
          break;
        
      case 'items':
   
      const addItem = () => {
        const newItems = [...items, { key: '', value: '', id: generateUniqueId() }]; 
        onChange(newItems);
      };
    
    
      const deleteItem = (itemToDelete) => {
        const newItems = items.filter(item => item !== itemToDelete);
        onChange(newItems); // Update the parent component
      };
    
      const updateItem = (updatedItem) => {
        const newItems = items.map(item => item.id === updatedItem.id ? updatedItem : item);
        onChange(newItems);
      };
    

      content = (
        <div className='flex flex-col '>
          {items.map((item, index) => (
            <ItemField
              key={item.id}              
              title={`${item.id}`}
              item={item}
              onDelete={() => deleteItem(item)}
              onItemChange={(updatedItem) => updateItem(updatedItem)}
              handleInputClick={(e) => handleInputClick(e, nodeId)}
              pills={pills}
              setPills={setPills}
              />
          ))}
          <button className='flex items-center text-gray-700 text-sm' onClick={addItem}>
            <PlusIcon className='add-item-icon' />
            Add item
          </button>
        </div>
      );
      break
      default:
        content = <div className="description">{info}</div>;
    }
      return (
    <div ref={drop} style={{ backgroundColor: isOver ? 'lightblue' : 'transparent' }}>
      {renderDroppedItems()}
      {content} {/* Keep the existing input field */}
    </div>
  );
  };
  
  const header = (
    <div className='font-semibold text-sm text-gray-600 mt-1'>
      <div>{title}</div>
      
    </div>
  );

  return (

    <div ref={drop} style={{ backgroundColor: isOver ? 'lightblue' : 'transparent' }} className="collapsible-field-container relative">
    {hasToggle && (
      <div className="toggle-container mt-3 mr-2" style={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>
        <Toggle title={toggleTitle} isToggled={isToggled} onToggleChange={handleToggleChange} />
      </div>
    )}

    <Collapse className="custom-collapse" accordion defaultActiveKey={['1']} expandIcon={({ isActive }) => CustomExpandIcon({ isActive })}>

      <Collapse.Panel header={header} key="1">
      {children}
        <div className='flex justify-between'>
          {renderContent()}
        </div>
        <div className='text-xxs text-gray-500 mt-3'>{info}</div>
      </Collapse.Panel>
    </Collapse>
    </div>
  );
};

export default CollapsibleField;






