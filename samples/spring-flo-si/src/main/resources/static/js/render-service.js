/*
 * Copyright 2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author Alex Boyko
 * @author Andy Clement
 */
define(function(require) {
	'use strict';
	
	var joint = require('joint');
	
	var dagre = require('dagre');
	
    var HANDLE_ICON_MAP = {
       	'remove': 'icons/delete.svg',	
    };
        
    var DECORATION_ICON_MAP = {
      	'error': 'icons/error.svg'
    };	

    var IMAGE_W = 120,
        IMAGE_H = 40;

    var HORIZONTAL_PADDING = 10;
	
	return ['$log', function($log) {

        function createHandle(kind) {
            return new joint.shapes.flo.ErrorDecoration({
                size: {width: 10, height: 10},
                attrs: {
                    'image': {
                        'xlink:href': HANDLE_ICON_MAP[kind]
                    }
                }
            });
        }

        function createDecoration(kind) {
            return new joint.shapes.flo.ErrorDecoration({
                size: {width: 16, height: 16},
                attrs: {
                    'image': {
                        'xlink:href': DECORATION_ICON_MAP[kind]
                    }
                }
            });
        }

        function createNode(/*metadata, props*/) {
			return new joint.shapes.flo.Node();
        }
        
        function initializeNewNode(node, context) {
        	var metadata = node.attr('metadata');
			if (metadata) {
	        	node.attr('.label/text', node.attr('metadata/name'));
				if (node.attr('metadata/constraints/maxIncomingLinksNumber') === 0) {
					node.attr('.input-port/display','none');
				}
				if (node.attr('metadata/constraints/maxOutgoingLinksNumber') === 0) {
					node.attr('.output-port/display','none');
				}

	            var type = node.attr('metadata/name');
	            if (type === 'tap') {
	                if (!node.attr('props/channel')) {
	                    node.attr('props/channel', 'tap:stream:STREAM');
	                }
	                refreshVisuals(node, 'props/channel', context.paper);
	            } else if (type === 'named-channel') {
	                // Default channel for named channel is 'queue:default'
	                if (!node.attr('props/channel')) {
	                    node.attr('props/channel', 'queue:default');
	                }
	                refreshVisuals(node, 'props/channel', context.paper);
	            }
			}
			node.attr('.label2/text','');

        }
        
        function validateNode(flo, node) {
        	return [];
        }
        
        function fitLabel(paper, node, labelPath) {
            var label = node.attr(labelPath);
            if (label && label.length<9) {
                return;
            }
            var view = paper.findViewByModel(node);
            if (view && label) {
                var textView = view.findBySelector(labelPath.substr(0, labelPath.indexOf('/')))[0];
                var offset = 0;
                if (node.attr('.label2/text')) {
                    var label2View = view.findBySelector('.label2')[0];
                    if (label2View) {
                        var box = joint.V(label2View).bbox(false, paper.viewport);
                        offset = HORIZONTAL_PADDING + box.width;
                    }
                }
                var width = joint.V(textView).bbox(false, paper.viewport).width;
                var threshold = IMAGE_W - HORIZONTAL_PADDING - HORIZONTAL_PADDING - offset;
                if (offset) {
                    node.attr('.label1/ref-x', Math.max((offset + HORIZONTAL_PADDING + width / 2) / IMAGE_W, 0.5), { silent: true });
                }
                for (var i = 1; i < label.length && width > threshold; i++) {
                    node.attr(labelPath, label.substr(0, label.length - i) + '\u2026', { silent: true });
                    view.update();
                    width = joint.V(textView).bbox(false, paper.viewport).width;
                    if (offset) {
                        node.attr('.label1/ref-x', Math.max((offset + HORIZONTAL_PADDING + width / 2) / IMAGE_W, 0.5), { silent: true });
                    }
                }
                view.update();
            }
        }

        function createLink() {
        	var link = new joint.shapes.flo.Link(joint.util.deepSupplement({
    	        smooth: true,
        		attrs: {
    	        	'.': { 
				//filter: { name: 'dropShadow', args: { dx: 1, dy: 1, blur: 2 } } 
			},
    	        	'.connection': { 'stroke-width': 3, 'stroke': 'black', 'stroke-linecap': 'round' },
    	        	'.marker-arrowheads': { display: 'none' },
    	        	'.tool-options': { display: 'none' }
    	        },
    	    }, joint.shapes.flo.Link.prototype.defaults));
        	return link;
        }
        
        function isSemanticProperty(propertyPath) {
        	return propertyPath === '.label/text';
        }
        
        function refreshVisuals(element, changedPropertyPath, paper) {
            fitLabel(paper, element, '.label/text');
        }

        function layout(paper) {
        	var graph = paper.model;
			var i;
			var g = new dagre.graphlib.Graph();
			g.setGraph({});
			g.setDefaultEdgeLabel(function() {return{};});

			var nodes = graph.getElements();
			for (i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				if (node.get('type') === joint.shapes.flo.NODE_TYPE) {
					g.setNode(node.id, node.get('size'));
				} 
			}
			
			var links = graph.getLinks();
			for (i = 0; i < links.length; i++) {
				var link = links[i];
				if (link.get('type') === joint.shapes.flo.LINK_TYPE) {
					var options = {
							minlen: 1.5
					};
//					if (link.get('labels') && link.get('labels').length > 0) {
//						options.minlen = 1 + link.get('labels').length * 0.5;
//					}
					g.setEdge(link.get('source').id, link.get('target').id, options);
					link.set('vertices', []);
				}
			}
			
			g.graph().rankdir = 'LR';
			dagre.layout(g);
			g.nodes().forEach(function(v) {
				var node = graph.getCell(v);
				if (node) {
					var bbox = node.getBBox();
					node.translate(g.node(v).x - bbox.x, g.node(v).y - bbox.y);
				}
			});
        }
        
        function getLinkAnchorPoint(linkView, view, magnet, reference) {
            if (magnet) {
                var type = magnet.getAttribute('type');
                var bbox = joint.V(magnet).bbox(false, linkView.paper.viewport);
                var rect = joint.g.rect(bbox);
                if (type === 'input') {
                    return joint.g.point(rect.x, rect.y + rect.height / 2);
                } else {
                    return joint.g.point(rect.x + rect.width, rect.y + rect.height / 2);
                }
            } else {
                $log.debug('No magnet!');
                return reference;
            }
        }

        return {
            'createHandle': createHandle,
            'createDecoration': createDecoration,
            'createNode': createNode,
            'createLink': createLink,
            'initializeNewNode': initializeNewNode,
            'isSemanticProperty': isSemanticProperty,
            'refreshVisuals': refreshVisuals,
            'layout': layout,
            'getLinkAnchorPoint': getLinkAnchorPoint
        };
	    
	}];

});
