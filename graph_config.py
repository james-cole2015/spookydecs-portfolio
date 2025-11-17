"""
Graph Visualization Configuration Module

This module contains all color schemes and visual configurations for the
deployment graph visualizations. Easily updateable for future migration
to AWS Parameter Store.

Author: SpookyDecs
Python Version: 3.12
"""

# =============================================================================
# CLASS TYPE CONFIGURATIONS
# =============================================================================

CLASS_TYPE_ACRONYMS = {
    'Receptacle': 'REC',
    'Outlet': 'OUT',
    'Plug': 'PLG',
    'Cord': 'CRD',
    'Inflatable': 'INF',
    'Static Prop': 'PRP',
    'Animatronic': 'ANI',
    'Spot Light': 'SPT',
    'String Light': 'STR',
}

# Color scheme for different item class types
# Using a professional, accessible color palette
CLASS_TYPE_COLORS = {
    'Receptacle': '#ef4444',      # Red - Power source
    'Outlet': '#f97316',          # Orange - Power distribution
    'Plug': '#f59e0b',            # Amber - Connectors
    'Cord': '#3b82f6',            # Blue - Cables/wiring
    'Inflatable': '#8b5cf6',      # Purple - Large decorations
    'Static Prop': '#ec4899',     # Pink - Static decorations
    'Animatronic': '#14b8a6',     # Teal - Animated decorations
    'Spot Light': '#facc15',      # Yellow - Lighting
    'String Light': '#fbbf24',    # Light yellow - String lighting
}

# Node sizes based on class type (in pixels for SVG rendering)
CLASS_TYPE_NODE_SIZES = {
    'Receptacle': 24,      # Larger for visibility as root nodes
    'Outlet': 20,
    'Plug': 18,
    'Cord': 16,            # Smaller for intermediate connections
    'Inflatable': 22,      # Larger for end decorations
    'Static Prop': 20,
    'Animatronic': 22,
    'Spot Light': 20,
    'String Light': 18,
}

# Node shapes (for future use if implementing different SVG shapes)
CLASS_TYPE_SHAPES = {
    'Receptacle': 'square',
    'Outlet': 'circle',
    'Plug': 'circle',
    'Cord': 'circle',
    'Inflatable': 'diamond',
    'Static Prop': 'diamond',
    'Animatronic': 'diamond',
    'Spot Light': 'star',
    'String Light': 'circle',
}

# =============================================================================
# CONNECTION TYPE CONFIGURATIONS
# =============================================================================

CONNECTION_COLORS = {
    'power': '#3b82f6',           # Blue - Power connections
    'illuminates': '#facc15',     # Yellow - Spotlight illumination
}

CONNECTION_STROKE_WIDTHS = {
    'power': 2,
    'illuminates': 1.5,
}

CONNECTION_STROKE_STYLES = {
    'power': None,                # Solid line (no dash array)
    'illuminates': '5,5',         # Dashed line (5px dash, 5px gap)
}

# Arrow marker configurations for directed edges
CONNECTION_ARROW_SIZES = {
    'power': 8,
    'illuminates': 6,
}

# =============================================================================
# ZONE CONFIGURATIONS
# =============================================================================

ZONE_COLORS = {
    'Front Yard': '#dbeafe',      # Light blue
    'Side Yard': '#dcfce7',       # Light green
    'Back Yard': '#fee2e2',       # Light red
}

ZONE_BORDER_COLORS = {
    'Front Yard': '#93c5fd',      # Medium blue
    'Side Yard': '#86efac',       # Medium green
    'Back Yard': '#fca5a5',       # Medium red
}

ZONE_BORDER_WIDTH = 2

# Zone padding (pixels) for bounding box calculations
ZONE_PADDING = {
    'horizontal': 40,
    'vertical': 40,
}

# =============================================================================
# LAYOUT CONFIGURATIONS
# =============================================================================

# Network (Force-Directed) Layout Parameters
NETWORK_LAYOUT_CONFIG = {
    'k': 1.5,                     # Optimal distance between nodes (networkx parameter)
    'iterations': 200,            # Number of force iterations
    'scale': 800,                 # Scale factor for node positions
    'center': (500, 400),         # Center point of the graph
    'seed': 42,                   # Random seed for reproducibility
}

# Tree Layout Parameters
TREE_LAYOUT_CONFIG = {
    'horizontal_spacing': 120,    # Horizontal space between nodes
    'vertical_spacing': 100,      # Vertical space between levels
    'tree_spacing': 200,          # Vertical space between different zone trees
    'root_x_offset': 150,         # X offset for root nodes
    'root_y_start': 50,           # Y position for first root node
}

# Illuminates edge curve parameters (for tree view)
ILLUMINATES_CURVE_CONFIG = {
    'control_point_offset': 50,   # How far control points extend
    'curve_direction': 'right',   # 'left' or 'right'
}

# =============================================================================
# TEXT AND LABEL CONFIGURATIONS
# =============================================================================

LABEL_CONFIG = {
    'font_size': 12,
    'font_family': 'Arial, sans-serif',
    'font_weight': 'normal',
    'text_anchor': 'middle',
    'fill': '#1f2937',            # Dark gray
    'offset_y': 20,               # Offset below node
}

# Port label configuration
PORT_LABEL_CONFIG = {
    'font_size': 9,
    'font_family': 'monospace',
    'fill': '#6b7280',            # Medium gray
}

# =============================================================================
# VIEWPORT AND CANVAS CONFIGURATIONS
# =============================================================================

VIEWPORT_CONFIG = {
    'default_width': 1200,
    'default_height': 800,
    'min_width': 800,
    'min_height': 600,
    'padding': 50,                # Padding around the entire graph
}

# Zoom limits
ZOOM_CONFIG = {
    'min_scale': 0.1,
    'max_scale': 4.0,
    'default_scale': 1.0,
}

# =============================================================================
# STATISTICS AND LEGEND CONFIGURATIONS
# =============================================================================

LEGEND_CONFIG = {
    'position': 'bottom-right',
    'background': '#ffffff',
    'border_color': '#e5e7eb',
    'padding': 16,
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_node_color(class_type: str) -> str:
    """
    Get color for a node based on its class type.
    
    Args:
        class_type: The class type of the item (e.g., 'Receptacle', 'Cord')
    
    Returns:
        Hex color string
    """
    return CLASS_TYPE_COLORS.get(class_type, '#9ca3af')  # Default gray


def get_node_size(class_type: str) -> int:
    """
    Get size for a node based on its class type.
    
    Args:
        class_type: The class type of the item
    
    Returns:
        Size in pixels
    """
    return CLASS_TYPE_NODE_SIZES.get(class_type, 18)  # Default size


def get_class_acronym(class_type: str) -> str:
    """
    Get three-letter acronym for a class type.
    
    Args:
        class_type: The class type of the item
    
    Returns:
        Three-letter acronym (e.g., 'REC', 'INF')
    """
    return CLASS_TYPE_ACRONYMS.get(class_type, 'UNK')  # Unknown


def get_edge_style(connection_type: str) -> dict:
    """
    Get complete edge styling for a connection type.
    
    Args:
        connection_type: Type of connection ('power' or 'illuminates')
    
    Returns:
        Dictionary with color, stroke_width, and stroke_dasharray
    """
    return {
        'color': CONNECTION_COLORS.get(connection_type, '#9ca3af'),
        'stroke_width': CONNECTION_STROKE_WIDTHS.get(connection_type, 2),
        'stroke_dasharray': CONNECTION_STROKE_STYLES.get(connection_type, None),
    }


def get_zone_colors(zone_name: str) -> dict:
    """
    Get fill and border colors for a zone.
    
    Args:
        zone_name: Name of the zone (e.g., 'Front Yard')
    
    Returns:
        Dictionary with fill_color and border_color
    """
    return {
        'fill_color': ZONE_COLORS.get(zone_name, '#f3f4f6'),
        'border_color': ZONE_BORDER_COLORS.get(zone_name, '#d1d5db'),
    }


def validate_config() -> bool:
    """
    Validate that all configuration dictionaries have matching keys.
    Useful for ensuring consistency across color, size, and acronym mappings.
    
    Returns:
        True if valid, raises ValueError if inconsistent
    """
    class_types = set(CLASS_TYPE_ACRONYMS.keys())
    color_types = set(CLASS_TYPE_COLORS.keys())
    size_types = set(CLASS_TYPE_NODE_SIZES.keys())
    
    if class_types != color_types or class_types != size_types:
        missing_colors = class_types - color_types
        missing_sizes = class_types - size_types
        extra_colors = color_types - class_types
        extra_sizes = size_types - class_types
        
        error_msg = "Configuration mismatch:\n"
        if missing_colors:
            error_msg += f"  Missing colors for: {missing_colors}\n"
        if missing_sizes:
            error_msg += f"  Missing sizes for: {missing_sizes}\n"
        if extra_colors:
            error_msg += f"  Extra colors defined: {extra_colors}\n"
        if extra_sizes:
            error_msg += f"  Extra sizes defined: {extra_sizes}\n"
        
        raise ValueError(error_msg)
    
    return True


# =============================================================================
# MIGRATION HELPERS (for future Parameter Store migration)
# =============================================================================

def export_to_json() -> dict:
    """
    Export all configuration as a JSON-serializable dictionary.
    Useful for migrating to AWS Parameter Store.
    
    Returns:
        Dictionary containing all configuration values
    """
    return {
        'class_type_acronyms': CLASS_TYPE_ACRONYMS,
        'class_type_colors': CLASS_TYPE_COLORS,
        'class_type_node_sizes': CLASS_TYPE_NODE_SIZES,
        'class_type_shapes': CLASS_TYPE_SHAPES,
        'connection_colors': CONNECTION_COLORS,
        'connection_stroke_widths': CONNECTION_STROKE_WIDTHS,
        'connection_stroke_styles': CONNECTION_STROKE_STYLES,
        'zone_colors': ZONE_COLORS,
        'zone_border_colors': ZONE_BORDER_COLORS,
        'network_layout_config': NETWORK_LAYOUT_CONFIG,
        'tree_layout_config': TREE_LAYOUT_CONFIG,
        'label_config': LABEL_CONFIG,
        'viewport_config': VIEWPORT_CONFIG,
        'zoom_config': ZOOM_CONFIG,
    }


def import_from_json(config_dict: dict) -> None:
    """
    Import configuration from a JSON dictionary.
    Useful for loading from AWS Parameter Store.
    
    Args:
        config_dict: Dictionary containing configuration values
    """
    global CLASS_TYPE_COLORS, CLASS_TYPE_NODE_SIZES
    global CONNECTION_COLORS, ZONE_COLORS
    global NETWORK_LAYOUT_CONFIG, TREE_LAYOUT_CONFIG
    
    # Update configurations with provided values
    if 'class_type_colors' in config_dict:
        CLASS_TYPE_COLORS.update(config_dict['class_type_colors'])
    
    if 'class_type_node_sizes' in config_dict:
        CLASS_TYPE_NODE_SIZES.update(config_dict['class_type_node_sizes'])
    
    if 'connection_colors' in config_dict:
        CONNECTION_COLORS.update(config_dict['connection_colors'])
    
    if 'zone_colors' in config_dict:
        ZONE_COLORS.update(config_dict['zone_colors'])
    
    if 'network_layout_config' in config_dict:
        NETWORK_LAYOUT_CONFIG.update(config_dict['network_layout_config'])
    
    if 'tree_layout_config' in config_dict:
        TREE_LAYOUT_CONFIG.update(config_dict['tree_layout_config'])


# Validate configuration on module import
if __name__ != '__main__':
    try:
        validate_config()
    except ValueError as e:
        print(f"WARNING: Configuration validation failed: {e}")
