/*
* Based on the tinyMCE core paragraph handling
* Released under LGPL License.
*
* License: http://tinymce.moxiecode.com/license
* Contributing: http://tinymce.moxiecode.com/contributing
*/

(function() {
	tinymce.create('tinymce.plugins.annoParagraphs', {
		init : function(ed, url) {

			var t = this;
			t.editor = ed;
			t.helper = ed.plugins.textorum.helper;
			t.textorum = ed.plugins.textorum;

			// Disable tab for everything except lists.
			ed.onKeyUp.addToTop(function(ed, e) {
				var inAList = !!ed.dom.getParent(ed.selection.getNode(), '.list, .list-item');
				if (e.keyCode == 9 && !inAList) {
					console.log()
					e.preventDefault();
					return false;
				}

				return preventDefaultKey(ed, e);
			});

			function preventDefaultKey(ed, e) {
				var parent = ed.dom.getParent(ed.selection.getNode(), '.list, .list-item');
				if (!e.shiftKey && e.keyCode == 13 && !parent) {
					e.preventDefault();
					return false;
				}
				return true;
			}

			ed.onKeyPress.addToTop(function(ed, e) {
				return preventDefaultKey(ed, e);
			});
		},

		// Create a controlManager to hangle new nodes, the dispatchers for onKeyUp, onKeyPress etc.. does not get passed a CM
		createControl : function (ed, cm) {
			this.cm = cm;
		},

		// A new node is selected programtically, not be user. onNodeChange won't work, we need to add it to keypress.
		_nodeChanged : function (ed) {
			if (c = this.cm.get('annoformatselect')) {
				var parent = ed.dom.getParent(ed.selection.getNode(), '.title, .p, .sec'), selVal;
				if (parent) {
					selVal = parent.nodeName.toLowerCase();
				}
				else {
					selVal = 'format';
				}
				c.select(selVal);
			}
		},

		getParentBlock : function(n) {
			var t = this, ed = t.editor;
			return ed.dom.getParent(n, ed.dom.isBlock);
		},

		insertPara : function(e) {
			var t = this, ed = t.editor, dom = ed.dom, d = ed.getDoc(), se = ed.settings, s = ed.selection.getSel(), r = ed.selection.getRng(), b = d.body;
			var rb, ra, dir, sn, so, en, eo, sb, eb, bn, bef, aft, sc, ec, n, vp = dom.getViewPort(ed.getWin()), y, ch, car;
			var TRUE = true, FALSE = false, newElement, node = ed.selection.getNode();
			ed.undoManager.beforeChange();
			// Override default tinyMCE element.
			se.element = t.textorum.translateElement('p');
			if (e.ctrlKey || /^(BODY|HTML|TITLE|SEC|P)$/.test(t.helper.getLocalName(node).toUpperCase())) {
				function insertNewBlock(node) {
					var newElement, parentNode;

					if (e.ctrlKey) {
						newElement = newSec();
						node = dom.getParent(node, t.helper.testNameIs('sec'));
					}
					else {
						newElement = dom.create(t.textorum.translateElement('p'), {'class': 'p', 'data-xmlel': 'p'}, '&#xA0;');
					}

					return dom.insertAfter(newElement, node);
				}
				// Create a new sec element with a title
				function newSec() {
					var sec = dom.create(t.textorum.translateElement('sec'), {'class': 'sec', 'data-xmlel': 'sec'});
					dom.add(sec, t.textorum.translateElement('title'), {'class': 'title', 'data-xmlel': 'title'}, '&#xA0;');
					return sec;
				}

				// Just insert a new paragraph if the ctrl key isn't held and the carat is in a para tag
				// Or, various tags should create paragraphs, not enter a br (when the ctrl key is held).
				if (/^(DISP-FORMULA|TABLE-WRAP|FIG|DISP-QUOTE|TITLE|P)$/.test(node.className.toUpperCase())) {
					newElement = insertNewBlock(node);
				}
				else if (/^(BODY|HTML)$/.test(t.helper.getLocalName(node).toUpperCase())) {
					secElement = dom.add(node, t.textorum.translateElement('sec'), {'class': 'sec', 'data-xmlel': 'sec'});
					newElement = dom.add(secElement, t.textorum.translateElement('title'), {'class': 'title', 'data-xmlel': 'title'}, '&#xA0;');
				}
				else if (parentNode = dom.getParent(node, '.fig')) {
					newElement = insertNewBlock(parentNode);
				}
				else if (parentNode = dom.getParent(node, '.table-wrap')) {
					newElement = insertNewBlock(parentNode);
				}
				else if (parentNode = dom.getParent(node, t.helper.testNameIs('sec'))) {
					newElement = insertNewBlock(parentNode);
				}
				else {
					newElement = insertNewBlock(node);
				}

				// Set new element as the first title tag, so we can select it
				if (newElement.nodeName.toLowerCase() == 'sec') {
					var eleArray = dom.select(' > title', newElement);
					if (eleArray.length > 0) {
						newElement = eleArray[0];
					}
				}

				// Move caret to the freshly created item
				if (d.createRange) {     // all browsers, except IE before version 9
					r = d.createRange();
					r.selectNodeContents(newElement);
				}
				else { // IE < 9
					r = d.selection.createRange();
					r.moveToElementText(newElement);
				}

				r.collapse(1);
				ed.selection.setRng(r);
				ed.undoManager.add();
				return FALSE;
			}
			// Setup before range
			rb = d.createRange();

			// If is before the first block element and in body, then move it into first block element
			rb.setStart(s.anchorNode, s.anchorOffset);
			rb.collapse(TRUE);

			// Setup after range
			ra = d.createRange();

			// If is before the first block element and in body, then move it into first block element
			ra.setStart(s.focusNode, s.focusOffset);
			ra.collapse(TRUE);

			// Setup start/end points
			dir = rb.compareBoundaryPoints(rb.START_TO_END, ra) < 0;
			sn = dir ? s.anchorNode : s.focusNode;
			so = dir ? s.anchorOffset : s.focusOffset;
			en = dir ? s.focusNode : s.anchorNode;
			eo = dir ? s.focusOffset : s.anchorOffset;

			// If selection is in empty table cell
			if (sn === en && /^(TD|TH|CAP)$/.test(sn.nodeName.toUpperCase())) {
				if (sn.firstChild && sn.firstChild.nodeName.toLowerCase() == 'br')
					dom.remove(sn.firstChild); // Remove BR

				// Create two new block elements
				if (sn.childNodes.length == 0) {
					ed.dom.add(sn, se.element, null, '<br />');
					aft = ed.dom.add(sn, se.element, null, '<br />');
				} else {
					n = sn.innerHTML;
					sn.innerHTML = '';
					ed.dom.add(sn, se.element, null, n);
					aft = ed.dom.add(sn, se.element, null, '<br />');
				}

				// Move caret into the last one
				r = d.createRange();
				r.selectNodeContents(aft);
				r.collapse(1);
				ed.selection.setRng(r);
				ed.undoManager.add();
				return FALSE;
			}

			function insertBr(ed) {
				var selection = ed.selection, rng = selection.getRng(), br, div = dom.create('div', null, ' '), divYPos, vpHeight = dom.getViewPort(ed.getWin()).h;

				// Insert BR element
				rng.insertNode(br = dom.create('br'));

				// Place caret after BR
				rng.setStartAfter(br);
				rng.setEndAfter(br);
				selection.setRng(rng);

				// Could not place caret after BR then insert an nbsp entity and move the caret
				if (selection.getSel().focusNode == br.previousSibling) {
					selection.select(dom.insertAfter(dom.doc.createTextNode('\u00a0'), br));
					selection.collapse(TRUE);
				}

				// Create a temporary DIV after the BR and get the position as it
				// seems like getPos() returns 0 for text nodes and BR elements.
				dom.insertAfter(div, br);
				divYPos = dom.getPos(div).y;
				dom.remove(div);

				// Scroll to new position, scrollIntoView can't be used due to bug: http://bugs.webkit.org/show_bug.cgi?id=16117
				if (divYPos > vpHeight) // It is not necessary to scroll if the DIV is inside the view port.
					ed.getWin().scrollTo(0, divYPos);
			};
			// If the caret is in an invalid location in FF we need to move it into the first block
			if (sn == b && en == b && b.firstChild && ed.dom.isBlock(b.firstChild)) {
				sn = en = sn.firstChild;
				so = eo = 0;
				rb = d.createRange();
				rb.setStart(sn, 0);
				ra = d.createRange();
				ra.setStart(en, 0);
			}

			// Never use body as start or end node
			sn = sn.nodeName.toUpperCase() == "HTML" ? d.body : sn; // Fix for Opera bug: https://bugs.opera.com/show_bug.cgi?id=273224&comments=yes
			sn = sn.nodeName.toUpperCase() == "BODY" ? sn.firstChild : sn;
			en = en.nodeName.toUpperCase() == "HTML" ? d.body : en; // Fix for Opera bug: https://bugs.opera.com/show_bug.cgi?id=273224&comments=yes
			en = en.nodeName.toUpperCase() == "BODY" ? en.firstChild : en;

			// Get start and end blocks
			sb = t.getParentBlock(sn);
			eb = t.getParentBlock(en);
			bn = sb ? sb.className : se.element.className; // Get block name to create

			// Return inside list use default browser behavior
			if (n = dom.getParent(sb, '.list-item, .pre')) {
				if (n.className.toUpperCase() == 'LIST-ITEM') {
					return annoListBreak(ed.selection, dom, n);
				}
				ed.undoManager.add();
				return TRUE;
			}

			// If the list item is empty, break out of it
			function annoListBreak(selection, dom, li) {
				var listBlock, block;
				if (dom.isEmpty(li) || li.innerHTML == '<br>') {
					listBlock = dom.getParent(li, '.list');
					if (!dom.getParent(listBlock.parentNode, '.list')) {
						dom.split(listBlock, li);
					}
					ed.undoManager.add();
					return FALSE;
				}
				ed.undoManager.add();
				return TRUE;
			};

			if (!/^(P|BODY|HTML)$/.test(bn.toUpperCase())) {
				insertBr(ed);
				ed.undoManager.add();
				return FALSE;
			}

			// If caption or absolute layers then always generate new blocks within
			if (sb && (sb.nodeName.toUpperCase() == 'CAP' || /absolute|relative|fixed/gi.test(dom.getStyle(sb, 'position', 1)))) {
				bn = se.element;
				sb = null;
			}

			// Use P instead
			if (/^(TD|TABLE|TH|CAP)$/.test(bn.toUpperCase()) || (sb && bn.toUpperCase() == "DIV" && /left|right/gi.test(dom.getStyle(sb, 'float', 1)))) {
				bn = se.element;
				sb = eb = null;
			}

			// Setup new before and after blocks
			bef = (sb && sb.nodeName.toUpperCase() == bn) ? sb.cloneNode(0) : ed.dom.create(bn);
			aft = (eb && eb.nodeName.toUpperCase() == bn) ? eb.cloneNode(0) : ed.dom.create(bn);

			// Remove id from after clone
			aft.removeAttribute('id');
			// Is header and cursor is at the end, then force paragraph under
			if (/^(HEADING)$/.test(bn) && isAtEnd(r, sb))
				aft = ed.dom.create(se.element);

			// Find start chop node
			n = sc = sn;
			do {
				if (n == b || n.nodeType == 9 || dom.isBlock(n) || /^(TD|TABLE|TH|CAP)$/.test(n.nodeName))
					break;

				sc = n;
			} while ((n = n.previousSibling ? n.previousSibling : n.parentNode));

			// Find end chop node
			n = ec = en;
			do {
				if (n == b || n.nodeType == 9 || dom.isBlock(n) || /^(TD|TABLE|TH|CAP)$/.test(n.nodeName))
					break;

				ec = n;
			} while ((n = n.nextSibling ? n.nextSibling : n.parentNode));

			// Place first chop part into before block element
			if (sc.nodeName.toUpperCase() == bn)
				rb.setStart(sc, 0);
			else
				rb.setStartBefore(sc);

			rb.setEnd(sn, so);
			bef.appendChild(rb.cloneContents() || d.createTextNode('')); // Empty text node needed for Safari

			// Place secnd chop part within new block element
			try {
				ra.setEndAfter(ec);
			} catch(ex) {
				//console.debug(s.focusNode, s.focusOffset);
			}
			ra.setStart(en, eo);
			aft.appendChild(ra.cloneContents() || d.createTextNode('')); // Empty text node needed for Safari
			// Create range around everything
			r = d.createRange();

			if (!sc.previousSibling && sc.parentNode.nodeName.toUpperCase() == bn) {
				r.setStartBefore(sc.parentNode);
			} else {
				if (rb.startContainer.nodeName.toUpperCase() == bn && rb.startOffset == 0)
					r.setStartBefore(rb.startContainer);
				else
					r.setStart(rb.startContainer, rb.startOffset);
			}

			if (!ec.nextSibling && ec.parentNode.nodeName.toUpperCase() == bn)
				r.setEndAfter(ec.parentNode);
			else
				r.setEnd(ra.endContainer, ra.endOffset);

			// Delete and replace it with new block elements
			r.deleteContents();

			// Never wrap blocks in blocks
			if (bef.firstChild && bef.firstChild.nodeName.toUpperCase() == bn)
				bef.innerHTML = bef.firstChild.innerHTML;

			if (aft.firstChild && aft.firstChild.nodeName.toUpperCase() == bn)
				aft.innerHTML = aft.firstChild.innerHTML;


			function appendStyles(e, en) {
				var nl = [], nn, n, i;

				e.innerHTML = '';

				// Make clones of style elements
				if (se.keep_styles) {
					n = en;
					do {
						// We only want style specific elements
						if (/^(SPAN|STRONG|B|EM|I|FONT|STRIKE|U)$/.test(n.nodeName.toUpperCase())) {
							nn = n.cloneNode(FALSE);
							dom.setAttrib(nn, 'id', ''); // Remove ID since it needs to be unique
							nl.push(nn);
						}
					} while (n = n.parentNode);
				}

				// Append style elements to aft
				if (nl.length > 0) {
					for (i = nl.length - 1, nn = e; i >= 0; i--)
						nn = nn.appendChild(nl[i]);

					// Padd most inner style element
					nl[0].innerHTML = isOpera ? '\u00a0' : '<br />'; // Extra space for Opera so that the caret can move there
					return nl[0]; // Move caret to most inner element
				} else
					e.innerHTML = '';
//					e.innerHTML = isOpera ? '\u00a0' : '<br />'; // Extra space for Opera so that the caret can move there
			};

			// Padd empty blocks
			if (dom.isEmpty(bef))
				appendStyles(bef, sn);

			// Fill empty afterblook with current style
			if (dom.isEmpty(aft))
				car = appendStyles(aft, en);

			// Opera needs this one backwards for older versions
			if (tinymce.isOpera && parseFloat(opera.version()) < 9.5) {
				r.insertNode(bef);
				r.insertNode(aft);
			}
			else {
				r.insertNode(aft);
				r.insertNode(bef);
			}

			aft.normalize();
			bef.normalize();

			if (!aft.innerHTML) {// && !tinymce.isIE) {
				aft.innerHTML = '<br />';
			}

			// Move cursor and scroll into view
			ed.selection.select(aft, true);
			ed.selection.collapse(true);
			if ((aft.innerHTML == '<br>' || aft.innerHTML == '<br />') && tinymce.isIE) {
				aft.innerHTML = '';
			}


			// scrollIntoView seems to scroll the parent window in most browsers now including FF 3.0b4 so it's time to stop using it and do it our selfs
			y = ed.dom.getPos(aft).y;
			//ch = aft.clientHeight;
			// Is element within viewport
			if (y < vp.y || y + 25 > vp.y + vp.h) {
				ed.getWin().scrollTo(0, y < vp.y ? y : y - vp.h + 25); // Needs to be hardcoded to roughly one line of text if a huge text block is broken into two blocks
			}
			ed.undoManager.add();

			return FALSE;
		},

		getInfo : function() {
			return {
				longname : 'Annotum Paragraphs',
				author : 'Crowd Favorite',
				authorurl : 'http://crowdfavorite.com',
				infourl : '',
				version : "1.0"
			};
		}
	});

	// Register plugin
	tinymce.PluginManager.add('annoParagraphs', tinymce.plugins.annoParagraphs);
})();
