import genstudio.plot as Plot

#
(p := Plot.dot([[1, 1], [2, 2], [3, 1], [4, 2]]).html())
#
p.save("foo.html")
