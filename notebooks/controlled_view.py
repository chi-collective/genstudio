# %%
import genstudio.plot as Plot
from genstudio.plot import js

# demonstrate that we can implement a "controlled component" with props derived from state,
# and when state changes the component is not unmounted.

showDotSource = """

             export function showDot({x, y, onMove}) {
                 React.useEffect(() => {
                 console.log(`mounted: x ${x}, y ${y}`)
                     return () => console.log("unmounted")
                 }, [])
                 const onMouseMove = React.useCallback((e) => {
                     // Get coordinates relative to the container by using getBoundingClientRect
                     const rect = e.currentTarget.getBoundingClientRect()
                     const mouseX = e.clientX - rect.left
                     const mouseY = e.clientY - rect.top
                     onMove({x: mouseX, y: mouseY})
                     }, [onMove])

                 return html(
                     ["div.border-4.border-black.w-[400px].h-[400px]",
                       {onMouseMove: onMouseMove},
                       ["div.absolute.w-[40px].h-[40px].bg-black.rounded-full", {style: {left: x, top: y}}]]
                 )
             }

             """

(
    Plot.Import(showDotSource, refer=["showDot"])
    | Plot.initialState({"x": 100, "y": 100})
    | [
        js("showDot"),
        {
            "x": js("`${$state.x}px`"),
            "y": js("`${$state.y}px`"),
            "onMove": js("({x, y}) => $state.update({x, y})"),
        },
    ]
)
# %%
