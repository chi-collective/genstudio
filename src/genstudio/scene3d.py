import genstudio.plot as Plot
from typing import Any, Dict, Union, Optional, TypedDict

import numpy as np

# Move Array type definition after imports
ArrayLike = Union[list, np.ndarray, Plot.JSExpr]
NumberLike = Union[int, float, np.number, Plot.JSExpr]


class Decoration(TypedDict, total=False):
    indexes: ArrayLike
    color: Optional[ArrayLike]  # [r,g,b]
    alpha: Optional[NumberLike]  # 0-1
    scale: Optional[NumberLike]  # scale factor


def deco(
    indexes: Union[int, np.integer, ArrayLike],
    *,
    color: Optional[ArrayLike] = None,
    alpha: Optional[NumberLike] = None,
    scale: Optional[NumberLike] = None,
) -> Decoration:
    """Create a decoration for scene components.

    Args:
        indexes: Single index or list of indices to decorate
        color: Optional RGB color override [r,g,b]
        alpha: Optional opacity value (0-1)
        scale: Optional scale factor

    Returns:
        Dictionary containing decoration settings
    """
    # Convert single index to list
    if isinstance(indexes, (int, np.integer)):
        indexes = np.array([indexes])

    # Create base decoration dict with Any type to avoid type conflicts
    decoration: Dict[str, Any] = {"indexes": indexes}

    # Add optional parameters if provided
    if color is not None:
        decoration["color"] = color
    if alpha is not None:
        decoration["alpha"] = alpha
    if scale is not None:
        decoration["scale"] = scale

    return decoration  # type: ignore


class SceneComponent(Plot.LayoutItem):
    """Base class for all 3D scene components."""

    def __init__(self, type_name: str, data: Dict[str, Any], **kwargs):
        super().__init__()
        self.type = type_name
        self.props = {**data, **kwargs}

    def to_js_call(self) -> Any:
        """Convert the element to a JSCall representation."""
        return Plot.JSCall(f"scene3d.{self.type}", [self.props])

    def for_json(self) -> Dict[str, Any]:
        """Convert the element to a JSON-compatible dictionary."""
        return Scene(self).for_json()

    def __add__(
        self, other: Union["SceneComponent", "Scene", Dict[str, Any]]
    ) -> "Scene":
        """Allow combining components with + operator."""
        if isinstance(other, Scene):
            return other + self
        elif isinstance(other, SceneComponent):
            return Scene(self, other)
        elif isinstance(other, dict):
            return Scene(self, other)
        else:
            raise TypeError(f"Cannot add SceneComponent with {type(other)}")

    def __radd__(self, other: Dict[str, Any]) -> "Scene":
        """Allow combining components with + operator when dict is on the left."""
        return Scene(self, other)

    def merge(
        self, new_props: Optional[Dict[str, Any]] = None, **kwargs: Any
    ) -> "SceneComponent":
        """Return a new SceneComponent with updated properties.

        This method does not modify the current SceneComponent instance. Instead, it creates and returns a *new* SceneComponent instance.
        The new instance's properties are derived by merging the properties of the current instance with the provided `new_props` and `kwargs`.
        If there are any conflicts in property keys, the values in `kwargs` take precedence over `new_props`, and `new_props` take precedence over the original properties of this SceneComponent.

        Args:
            new_props: An optional dictionary of new properties to merge. These properties will override the existing properties of this SceneComponent if there are key conflicts.
            **kwargs: Additional keyword arguments representing properties to merge. These properties will take the highest precedence in case of key conflicts, overriding both `new_props` and the existing properties.

        Returns:
            A new SceneComponent instance with all properties merged.
        """
        merged_props = {**self.props}  # Start with existing props
        if new_props:
            merged_props.update(new_props)  # Update with new_props
        merged_props.update(kwargs)  # Update with kwargs, overriding if necessary
        return SceneComponent(
            self.type, merged_props
        )  # Create and return a new instance


class Scene(Plot.LayoutItem):
    """A 3D scene visualization component using WebGPU.

    This class creates an interactive 3D scene that can contain multiple types of components:

    - Point clouds
    - Ellipsoids
    - Ellipsoid bounds (wireframe)
    - Cuboids

    The visualization supports:

    - Orbit camera control (left mouse drag)
    - Pan camera control (shift + left mouse drag or middle mouse drag)
    - Zoom control (mouse wheel)
    - Component hover highlighting
    - Component click selection
    - Optional FPS display (set controls=['fps'])
    """

    def __init__(
        self,
        *components_and_props: Union[SceneComponent, Dict[str, Any]],
    ):
        """Initialize the scene.

        Args:
            *components_and_props: Scene components and optional properties.
                Properties can include:
                - controls: List of controls to show. Currently supports ['fps']
        """
        components = []
        scene_props = {}
        for item in components_and_props:
            if isinstance(item, SceneComponent):
                components.append(item)
            elif isinstance(item, dict):
                scene_props.update(item)
            else:
                raise TypeError(f"Invalid type in components_and_props: {type(item)}")

        self.components = components
        self.scene_props = scene_props
        super().__init__()

    def __add__(self, other: Union[SceneComponent, "Scene", Dict[str, Any]]) -> "Scene":
        """Allow combining scenes with + operator."""
        if isinstance(other, Scene):
            return Scene(
                *self.components, *other.components, self.scene_props, other.scene_props
            )
        elif isinstance(other, SceneComponent):
            return Scene(*self.components, other, self.scene_props)
        elif isinstance(other, dict):
            return Scene(*self.components, {**self.scene_props, **other})
        else:
            raise TypeError(f"Cannot add Scene with {type(other)}")

    def __radd__(self, other: Dict[str, Any]) -> "Scene":
        """Allow combining scenes with + operator when dict is on the left."""
        return Scene(*self.components, {**other, **self.scene_props})

    def for_json(self) -> Any:
        """Convert to JSON representation for JavaScript."""
        components = [
            e.to_js_call() if isinstance(e, SceneComponent) else e
            for e in self.components
        ]

        props = {"components": components, **self.scene_props}

        return [Plot.JSRef("scene3d.Scene"), props]


def flatten_array(arr: Any, dtype: Any = np.float32) -> Any:
    """Flatten an array if it is a 2D array, otherwise return as is.

    Args:
        arr: The array to flatten.
        dtype: The desired data type of the array.

    Returns:
        A flattened array if input is 2D, otherwise the original array.
    """
    if isinstance(arr, (np.ndarray, list)):
        arr = np.asarray(arr, dtype=dtype)
        if arr.ndim == 2:
            return arr.flatten()
    return arr


def PointCloud(
    positions: ArrayLike,
    colors: Optional[ArrayLike] = None,
    color: Optional[ArrayLike] = None,  # Default RGB color for all points
    sizes: Optional[ArrayLike] = None,
    size: Optional[NumberLike] = None,  # Default size for all points
    alphas: Optional[ArrayLike] = None,
    alpha: Optional[NumberLike] = None,  # Default alpha for all points
    **kwargs: Any,
) -> SceneComponent:
    """Create a point cloud element.

    Args:
        positions: Nx3 array of point positions or flattened array
        colors: Nx3 array of RGB colors or flattened array (optional)
        color: Default RGB color [r,g,b] for all points if colors not provided
        sizes: N array of point sizes or flattened array (optional)
        size: Default size for all points if sizes not provided
        alphas: Array of alpha values per point (optional)
        alpha: Default alpha value for all points if alphas not provided
        **kwargs: Additional arguments like decorations, onHover, onClick
    """
    positions = flatten_array(positions, dtype=np.float32)
    data: Dict[str, Any] = {"positions": positions}

    if colors is not None:
        data["colors"] = flatten_array(colors, dtype=np.float32)
    if color is not None:
        data["color"] = color

    if sizes is not None:
        data["sizes"] = flatten_array(sizes, dtype=np.float32)
    if size is not None:
        data["size"] = size

    if alphas is not None:
        data["alphas"] = flatten_array(alphas, dtype=np.float32)
    if alpha is not None:
        data["alpha"] = alpha

    return SceneComponent("PointCloud", data, **kwargs)


def Ellipsoid(
    centers: ArrayLike,
    radii: Optional[ArrayLike] = None,
    radius: Optional[Union[NumberLike, ArrayLike]] = None,  # Single value or [x,y,z]
    colors: Optional[ArrayLike] = None,
    color: Optional[ArrayLike] = None,  # Default RGB color for all ellipsoids
    alphas: Optional[ArrayLike] = None,
    alpha: Optional[NumberLike] = None,  # Default alpha for all ellipsoids
    **kwargs: Any,
) -> SceneComponent:
    """Create an ellipsoid element.

    Args:
        centers: Nx3 array of ellipsoid centers or flattened array
        radii: Nx3 array of radii (x,y,z) or flattened array (optional)
        radius: Default radius (sphere) or [x,y,z] radii (ellipsoid) if radii not provided
        colors: Nx3 array of RGB colors or flattened array (optional)
        color: Default RGB color [r,g,b] for all ellipsoids if colors not provided
        alphas: Array of alpha values per ellipsoid (optional)
        alpha: Default alpha value for all ellipsoids if alphas not provided
        **kwargs: Additional arguments like decorations, onHover, onClick
    """
    centers = flatten_array(centers, dtype=np.float32)
    data: Dict[str, Any] = {"centers": centers}

    if radii is not None:
        data["radii"] = flatten_array(radii, dtype=np.float32)
    elif radius is not None:
        data["radius"] = radius

    if colors is not None:
        data["colors"] = flatten_array(colors, dtype=np.float32)
    elif color is not None:
        data["color"] = color

    if alphas is not None:
        data["alphas"] = flatten_array(alphas, dtype=np.float32)
    elif alpha is not None:
        data["alpha"] = alpha

    return SceneComponent("Ellipsoid", data, **kwargs)


def EllipsoidAxes(
    centers: ArrayLike,
    radii: Optional[ArrayLike] = None,
    radius: Optional[Union[NumberLike, ArrayLike]] = None,  # Single value or [x,y,z]
    colors: Optional[ArrayLike] = None,
    color: Optional[ArrayLike] = None,  # Default RGB color for all ellipsoids
    alphas: Optional[ArrayLike] = None,  # Per-ellipsoid alpha values
    alpha: Optional[NumberLike] = None,  # Default alpha for all ellipsoids
    **kwargs: Any,
) -> SceneComponent:
    """Create an ellipsoid bounds (wireframe) element.

    Args:
        centers: Nx3 array of ellipsoid centers or flattened array
        radii: Nx3 array of radii (x,y,z) or flattened array (optional)
        radius: Default radius (sphere) or [x,y,z] radii (ellipsoid) if radii not provided
        colors: Nx3 array of RGB colors or flattened array (optional)
        color: Default RGB color [r,g,b] for all ellipsoids if colors not provided
        alphas: Array of alpha values per ellipsoid (optional)
        alpha: Default alpha value for all ellipsoids if alphas not provided
        **kwargs: Additional arguments like decorations, onHover, onClick
    """
    centers = flatten_array(centers, dtype=np.float32)
    data: Dict[str, Any] = {"centers": centers}

    if radii is not None:
        data["radii"] = flatten_array(radii, dtype=np.float32)
    elif radius is not None:
        data["radius"] = radius

    if colors is not None:
        data["colors"] = flatten_array(colors, dtype=np.float32)
    elif color is not None:
        data["color"] = color

    if alphas is not None:
        data["alphas"] = flatten_array(alphas, dtype=np.float32)
    elif alpha is not None:
        data["alpha"] = alpha

    return SceneComponent("EllipsoidAxes", data, **kwargs)


def Cuboid(
    centers: ArrayLike,
    sizes: Optional[ArrayLike] = None,
    size: Optional[
        Union[ArrayLike, NumberLike]
    ] = None,  # Default size [w,h,d] for all cuboids
    colors: Optional[ArrayLike] = None,
    color: Optional[ArrayLike] = None,  # Default RGB color for all cuboids
    alphas: Optional[ArrayLike] = None,  # Per-cuboid alpha values
    alpha: Optional[NumberLike] = None,  # Default alpha for all cuboids
    **kwargs: Any,
) -> SceneComponent:
    """Create a cuboid element.

    Args:
        centers: Nx3 array of cuboid centers or flattened array
        sizes: Nx3 array of sizes (width,height,depth) or flattened array (optional)
        size: Default size [w,h,d] for all cuboids if sizes not provided
        colors: Nx3 array of RGB colors or flattened array (optional)
        color: Default RGB color [r,g,b] for all cuboids if colors not provided
        alphas: Array of alpha values per cuboid (optional)
        alpha: Default alpha value for all cuboids if alphas not provided
        **kwargs: Additional arguments like decorations, onHover, onClick
    """
    centers = flatten_array(centers, dtype=np.float32)
    data: Dict[str, Any] = {"centers": centers}

    if sizes is not None:
        data["sizes"] = flatten_array(sizes, dtype=np.float32)
    elif size is not None:
        data["size"] = size

    if colors is not None:
        data["colors"] = flatten_array(colors, dtype=np.float32)
    elif color is not None:
        data["color"] = color

    if alphas is not None:
        data["alphas"] = flatten_array(alphas, dtype=np.float32)
    elif alpha is not None:
        data["alpha"] = alpha

    return SceneComponent("Cuboid", data, **kwargs)


def LineBeams(
    positions: ArrayLike,  # Array of quadruples [x,y,z,i, x,y,z,i, ...]
    color: Optional[ArrayLike] = None,  # Default RGB color for all beams
    size: Optional[NumberLike] = None,  # Default size for all beams
    colors: Optional[ArrayLike] = None,  # Per-line colors
    sizes: Optional[ArrayLike] = None,  # Per-line sizes
    alpha: Optional[NumberLike] = None,  # Default alpha for all beams
    alphas: Optional[ArrayLike] = None,  # Per-line alpha values
    **kwargs: Any,
) -> SceneComponent:
    """Create a line beams element.

    Args:
        positions: Array of quadruples [x,y,z,i, x,y,z,i, ...] where points sharing the same i value are connected in sequence
        color: Default RGB color [r,g,b] for all beams if colors not provided
        size: Default size for all beams if sizes not provided
        colors: Array of RGB colors per line (optional)
        sizes: Array of sizes per line (optional)
        alpha: Default alpha value for all beams if alphas not provided
        alphas: Array of alpha values per line (optional)
        **kwargs: Additional arguments like onHover, onClick

    Returns:
        A LineBeams scene component that renders connected beam segments.
        Points are connected in sequence within groups sharing the same i value.
    """
    data: Dict[str, Any] = {"positions": flatten_array(positions, dtype=np.float32)}

    if color is not None:
        data["color"] = color
    if size is not None:
        data["size"] = size
    if colors is not None:
        data["colors"] = flatten_array(colors, dtype=np.float32)
    if sizes is not None:
        data["sizes"] = flatten_array(sizes, dtype=np.float32)
    if alphas is not None:
        data["alphas"] = flatten_array(alphas, dtype=np.float32)
    elif alpha is not None:
        data["alpha"] = alpha

    return SceneComponent("LineBeams", data, **kwargs)


__all__ = [
    "Scene",
    "PointCloud",
    "Ellipsoid",
    "EllipsoidAxes",
    "Cuboid",
    "LineBeams",
    "deco",
]
