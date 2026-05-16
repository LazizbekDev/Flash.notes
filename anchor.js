// anchor.js - Robust element anchoring system for floating comments

/**
 * Generates a CSS selector for an element
 */
const getCssSelector = (el) => {
  if (el.tagName.toLowerCase() === "html") return "html";
  
  let path = [];
  let current = el;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // IDs should be unique, so we can stop here
    } else {
      let sibling = current;
      let nth = 1;
      
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        if (sibling.nodeName.toLowerCase() === selector) {
          nth++;
        }
      }
      
      if (nth !== 1) {
        selector += `:nth-of-type(${nth})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentNode;
  }
  
  return path.join(" > ");
};

/**
 * Generates an XPath for an element
 */
const getXPath = (el) => {
  if (el.id !== '') {
    return `id("${el.id}")`;
  }
  if (el === document.body) {
    return el.tagName;
  }
  
  let ix = 0;
  let siblings = el.parentNode.childNodes;
  for (let i = 0; i < siblings.length; i++) {
    let sibling = siblings[i];
    if (sibling === el) {
      return getXPath(el.parentNode) + '/' + el.tagName + '[' + (ix + 1) + ']';
    }
    if (sibling.nodeType === 1 && sibling.tagName === el.tagName) {
      ix++;
    }
  }
};

/**
 * Creates an anchor object for a given element and a click event
 * The anchor object stores robust locators to find this element again
 */
const createAnchor = (element, event) => {
  const rect = element.getBoundingClientRect();
  
  // Calculate relative offset of the click within the element
  // Used to position the comment exactly where the user clicked
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  const percentX = rect.width ? offsetX / rect.width : 0;
  const percentY = rect.height ? offsetY / rect.height : 0;

  return {
    selector: getCssSelector(element),
    xpath: getXPath(element),
    textContent: element.textContent ? element.textContent.slice(0, 100) : null,
    percentX,
    percentY,
    width: rect.width,
    height: rect.height,
    url: window.location.href.split('#')[0] // Ignore hash fragments
  };
};

/**
 * Tries to find an element based on an anchor object
 */
const findElementByAnchor = (anchor) => {
  // 1. Try CSS Selector
  if (anchor.selector) {
    try {
      const el = document.querySelector(anchor.selector);
      if (el) return el;
    } catch (e) {
      console.warn("Invalid selector generated", anchor.selector);
    }
  }
  
  // 2. Try XPath
  if (anchor.xpath) {
    try {
      const el = document.evaluate(
        anchor.xpath, 
        document, 
        null, 
        XPathResult.FIRST_ORDERED_NODE_TYPE, 
        null
      ).singleNodeValue;
      if (el) return el;
    } catch (e) {
      console.warn("Invalid xpath generated", anchor.xpath);
    }
  }
  
  // 3. Fallback: search for elements with same text content
  if (anchor.textContent) {
    const allElements = document.querySelectorAll('*');
    for (let el of allElements) {
      if (el.children.length === 0 && el.textContent && el.textContent.includes(anchor.textContent)) {
        return el;
      }
    }
  }
  
  return null;
};

// Export to global window object for content.js to access
window.FlashNoteAnchor = {
  createAnchor,
  findElementByAnchor
};
