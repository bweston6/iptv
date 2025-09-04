export function nextInteractiveElement(element, returnCurrent = false, noChildren = false) {
  if (!element || element.tagName === 'BODY') {
    return document.querySelector(':is(a, button, input)');
  }

  // current element
  const interactiveTags = ['A', 'BUTTON', 'INPUT'];
  if (returnCurrent && interactiveTags.includes(element.tagName)) {
    return element;
  }

  let sibling = element.nextElementSibling;
  while (sibling) {
    // sibling elemenet
    if (interactiveTags.includes(sibling.tagName)) {
      return sibling;
    }

    // child element
    if (!noChildren && sibling.firstElementChild) {
      const interactiveChild = nextInteractiveElement(sibling.firstElementChild, true);
      if (interactiveChild) {
        return interactiveChild;
      }
    }
    sibling = sibling.nextElementSibling;
  }

  // parent element
  return nextInteractiveElement(element.parentElement, true, true);
}

export function previousInteractiveElement(element, returnCurrent = false, noChildren = false) {
  if (!element || element.tagName === 'BODY') {
    return Array.from(document.querySelectorAll(':is(a, button, input)')).pop();
  }

  // current element
  const interactiveTags = ['A', 'BUTTON', 'INPUT'];
  if (returnCurrent && interactiveTags.includes(element.tagName)) {
    return element;
  }

  let sibling = element.previousElementSibling;
  while (sibling) {
    // sibling elemenet
    if (interactiveTags.includes(sibling.tagName)) {
      return sibling;
    }

    // child element
    if (!noChildren && sibling.lastElementChild) {
      const interactiveChild = previousInteractiveElement(sibling.lastElementChild, true);
      if (interactiveChild) {
        return interactiveChild;
      }
    }
    sibling = sibling.previousElementSibling;
  }

  // parent element
  return previousInteractiveElement(element.parentElement, true, true);
}
