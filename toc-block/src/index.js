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
    // headingList is always synced to attributes.tocItems
    const [headingList, setHeadingList] = useState(attributes.tocItems || []);

        // Real-time scan for H2s in the post content using MutationObserver
        useEffect(() => {
            const content = document.querySelector('.block-editor-writing-flow');
            if (!content) return;

            // Find the block's root DOM node
            const blockNode = document.querySelector(`[data-block="${blockProps['data-block']}"]`);
            // Find the closest parent <section> of the block
            let section = blockNode ? blockNode.closest('section') : null;
            if (!section) {
                // fallback: use all H2s if not inside a section
                section = content;
            }

            const normalize = str => (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
            const updateHeadings = () => {
                // Only get H2s inside the same <section> as this block
                const h2s = Array.from(section.querySelectorAll('h2'));
                // Build a map of existing tocItems by normalized text
                const tocMap = {};
                (attributes.tocItems || []).forEach(item => {
                    tocMap[normalize(item.text)] = item;
                });
                // Build new tocItems, preserving ignore/customLabel for existing normalized text
                const items = h2s.map((h2) => {
                    const text = h2.innerText || h2.textContent || '';
                    const anchor = createAnchor(text);
                    const prev = tocMap[normalize(text)];
                    return {
                        text,
                        anchor,
                        customLabel: prev ? prev.customLabel : '',
                        ignore: prev ? !!prev.ignore : false,
                    };
                });
                setHeadingList(items);
                // Only update attributes if items actually changed
                const current = attributes.tocItems || [];
                const isSame =
                    current.length === items.length &&
                    current.every((item, i) =>
                        item.text === items[i].text &&
                        item.anchor === items[i].anchor &&
                        item.customLabel === items[i].customLabel &&
                        item.ignore === items[i].ignore
                    );
                if (!isSame) {
                    setAttributes({ tocItems: items });
                }
            };

            updateHeadings();

            const observer = new window.MutationObserver(() => {
                updateHeadings();
            });
            observer.observe(content, {
                childList: true,
                subtree: true,
                characterData: true,
            });

            return () => observer.disconnect();
        }, [attributes.tocItems]);

        // Handle custom label change (persist to attributes)
        const handleLabelChange = (anchor, value) => {
            const newItems = (attributes.tocItems || []).map(item =>
                item.anchor === anchor ? { ...item, customLabel: value } : item
            );
            setAttributes({ tocItems: newItems });
        };

        // Handle ignore toggle (persist to attributes)
        const handleIgnoreChange = (anchor, checked) => {
            const newItems = (attributes.tocItems || []).map(item =>
                item.anchor === anchor ? { ...item, ignore: checked } : item
            );
            setAttributes({ tocItems: newItems });
        };

        return (
            <div {...blockProps}>
                <InspectorControls>
                    <PanelBody title="Customize TOC Labels & Visibility">
                        {(attributes.tocItems || []).map((item, i) => (
                            <div key={item.anchor} style={{ marginBottom: '1em' }}>
                                <TextControl
                                    label={`Label for: ${item.text}`}
                                    value={item.customLabel || ''}
                                    onChange={val => handleLabelChange(item.anchor, val)}
                                    placeholder={item.text}
                                />
                                <label style={{ display: 'block', marginTop: '0.3em' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!item.ignore}
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
                        {(attributes.tocItems || [])
                            .filter(item => {
                                if (item.ignore) return false;
                                const label = (item.customLabel !== '' ? item.customLabel : item.text).trim();
                                const anchor = (item.anchor || '').trim();
                                return label !== '' && anchor !== '';
                            })
                            .map((item, i) => (
                                <li key={item.anchor}>
                                    <a href={`#${item.anchor}`}>{item.customLabel || item.text}</a>
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
