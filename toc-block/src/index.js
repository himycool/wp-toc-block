import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';

// Helper to create anchor from text, trimmed to 30 chars
function createAnchor(text) {
    let anchorSlug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (anchorSlug.length > 30) {
        anchorSlug = anchorSlug.substring(0, 30).replace(/-+$/g, '');
        anchorSlug += '...';
    }
    return anchorSlug;
}

registerBlockType('toc-block/inner-toc', {
    title: 'Inner Table of Contents',
    icon: 'list-view',
    category: 'widgets',
    attributes: {
        tocItems: {
            type: 'array',
            default: [],
        },
    },
    edit({ attributes, setAttributes }) {
        const blockProps = useBlockProps();
        const [headingList, setHeadingList] = useState([]);
        const [customLabelMap, setCustomLabelMap] = useState({});
        const [ignoreMap, setIgnoreMap] = useState({});

        // Scan for H2s in the post content
        useEffect(() => {
            const content = document.querySelector('.block-editor-writing-flow');
            if (!content) return;
            const h2s = Array.from(content.querySelectorAll('h2'));
            const items = h2s.map((h2, i) => {
                const text = h2.innerText || h2.textContent || '';
                const anchor = createAnchor(text);
                return {
                    text,
                    anchor,
                    customLabel: customLabelMap[anchor] || '',
                    ignore: !!ignoreMap[anchor],
                };
            });
            setHeadingList(items);
            setAttributes({ tocItems: items });
        }, [customLabelMap, ignoreMap]);

        // Handle custom label change
        const handleLabelChange = (anchor, value) => {
            setCustomLabelMap({ ...customLabelMap, [anchor]: value });
        };

        // Handle ignore toggle
        const handleIgnoreChange = (anchor, checked) => {
            setIgnoreMap({ ...ignoreMap, [anchor]: checked });
        };

        return (
            <div {...blockProps}>
                <InspectorControls>
                    <PanelBody title="Customize TOC Labels & Visibility">
                        {headingList.map((item, i) => (
                            <div key={item.anchor} style={{ marginBottom: '1em' }}>
                                <TextControl
                                    label={`Label for: ${item.text}`}
                                    value={customLabelMap[item.anchor] || ''}
                                    onChange={val => handleLabelChange(item.anchor, val)}
                                    placeholder={item.text}
                                />
                                <label style={{ display: 'block', marginTop: '0.3em' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!ignoreMap[item.anchor]}
                                        onChange={e => handleIgnoreChange(item.anchor, e.target.checked)}
                                    />{' '}
                                      Ignore this H2 in TOC <span style={{ color: '#666', fontStyle: 'italic' }}>({item.text})</span>
                                </label>
                            </div>
                        ))}
                    </PanelBody>
                </InspectorControls>
                <nav className="toc-block-inner-toc">
                    <ul>
                        {headingList.filter(item => !item.ignore).map((item, i) => (
                            <li key={item.anchor}>
                                <a href={`#${item.anchor}`}>{customLabelMap[item.anchor] || item.text}</a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        );
    },
    save() {
        // Rendered in PHP
        return null;
    },
});
