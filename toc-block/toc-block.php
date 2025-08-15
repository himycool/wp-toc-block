<?php
/*
Plugin Name: TOC Block
Description: Adds a block for an inner Table of Contents (TOC) that lists all H2s, allows custom TOC labels, and generates anchor links trimmed to 30 characters.
Version: 1.0.0
Author: D.K. Himas Khan
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'TOC_BLOCK_DIR', plugin_dir_path( __FILE__ ) );
define( 'TOC_BLOCK_URL', plugin_dir_url( __FILE__ ) );

function tocBlockRegisterBlock() {
    // Enqueue block editor JS
    wp_register_script(
        'toc-block-editor',
        TOC_BLOCK_URL . 'build/index.js',
        array( 'wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n' ),
        filemtime( TOC_BLOCK_DIR . 'build/index.js' )
    );

    // Enqueue block editor CSS (optional)
    wp_register_style(
        'toc-block-editor-style',
        TOC_BLOCK_URL . 'build/editor.css',
        array( 'wp-edit-blocks' ),
        filemtime( TOC_BLOCK_DIR . 'build/editor.css' )
    );

    // Enqueue frontend CSS (optional)
    wp_register_style(
        'toc-block-style',
        TOC_BLOCK_URL . 'build/style.css',
        array(),
        filemtime( TOC_BLOCK_DIR . 'build/style.css' )
    );

    register_block_type( 'toc-block/inner-toc', array(
        'editor_script' => 'toc-block-editor',
        'editor_style'  => 'toc-block-editor-style',
        'style'         => 'toc-block-style',
        'render_callback' => 'tocBlockRenderCallback',
        'attributes'    => array(
            'tocItems' => array(
                'type' => 'array',
                'default' => array(),
            ),
        ),
    ) );
}
add_action( 'init', 'tocBlockRegisterBlock' );

function tocBlockRenderCallback( $attributes ) {
    if ( empty( $attributes['tocItems'] ) ) {
        return '';
    }
    $output = '<nav class="toc-block-inner-toc"><ul>';
    foreach ( $attributes['tocItems'] as $item ) {
        if ( !empty( $item['ignore'] ) ) { continue; }
        $label = esc_html( $item['customLabel'] !== '' ? $item['customLabel'] : $item['text'] );
        $anchor = esc_attr( $item['anchor'] );
        $output .= "<li><a href='#$anchor'>$label</a></li>";
    }
    $output .= '</ul></nav>';
    return $output;
}

// Add IDs to H2s in post content to match TOC anchors
add_filter('the_content', function($content) {
    if (is_admin()) { return $content; }
    // Use DOMDocument to parse and modify content
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $encoding = "<?xml encoding='utf-8' ?>";
    $dom->loadHTML($encoding . $content, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    $h2s = $dom->getElementsByTagName('h2');
    $usedAnchors = array();
    foreach ($h2s as $h2) {
        $text = $h2->textContent;
        // Generate anchor (same as JS)
        $slug = strtolower($text);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = preg_replace('/(^-+)|(-+$)/', '', $slug);
        if (strlen($slug) > 30) {
            $slug = substr($slug, 0, 30);
            $slug = preg_replace('/-+$/', '', $slug);
            $slug .= '...';
        }
        // Ensure unique IDs if duplicate headings
        $baseSlug = $slug;
        $i = 2;
        while (in_array($slug, $usedAnchors)) {
            $slug = $baseSlug . '-' . $i;
            $i++;
        }
        $usedAnchors[] = $slug;
        $h2->setAttribute('id', $slug);
    }
    $html = $dom->saveHTML();
    // Remove the encoding declaration
    $html = preg_replace('/^<\?xml.*?\?>/', '', $html);
    return $html;
}, 20);
