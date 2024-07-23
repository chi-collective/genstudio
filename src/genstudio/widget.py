import datetime
import json

from typing import Iterable

import anywidget
import traitlets


from genstudio.util import PARENT_PATH


def to_json(data):
    def default(obj):
        if hasattr(obj, "to_json"):
            return obj.to_json()
        if hasattr(obj, "tolist"):
            return obj.tolist()
        if isinstance(obj, Iterable):
            # Check if the iterable might be exhaustible
            if not hasattr(obj, "__len__") and not hasattr(obj, "__getitem__"):
                print(
                    f"Warning: Potentially exhaustible iterator encountered: {type(obj).__name__}"
                )
            return list(obj)
        elif isinstance(obj, (datetime.date, datetime.datetime)):
            return {"pyobsplot-type": "datetime", "value": obj.isoformat()}
        else:
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    return json.dumps(data, default=default)


class Widget(anywidget.AnyWidget):
    _esm = PARENT_PATH / "js/widget_build.js"
    _css = PARENT_PATH / "widget.css"
    data = traitlets.Any().tag(sync=True, to_json=lambda x, _: to_json(x))

    def __init__(self, data):
        super().__init__()
        self.data = data

    def _repr_mimebundle_(self, **kwargs):  # type: ignore
        return super()._repr_mimebundle_(**kwargs)

    @anywidget.experimental.command  # type: ignore
    def callback(self, id: str, buffers: list[bytes]) -> tuple[str, list[bytes]]:
        print(f"Received callback with id: {id}")
        return f"Callback {id} processed", buffers
