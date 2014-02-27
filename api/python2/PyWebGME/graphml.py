from xml.dom.minidom import Document
import xml.etree.ElementTree as ET
class graphml:
    def __init__(self):
        root = ET.Element("graphml",{"xmlns":"http://graphml.graphdrawing.org/xmlns"})
        self.__doc = ET.ElementTree(root)
        ET.SubElement(root,"key", {"id":"_label_","for":"node", "attr.name":"label", "attr.type":"string"})
        self.__graph = ET.SubElement(root,"graph",{"id":"G","edgedefault":"directed"})
    def addNode(self,id,label):
        node = ET.SubElement(self.__graph,"node",{"id":id})
        if label != None:
            nodedata = ET.SubElement(node,"data",{"key":"_label_"})
            nodedata.text = label
    def addEdge(self,source,target):
        ET.SubElement(self.__graph,"edge",{"source":source,"target":target})
    def display(self):
        ET.dump(self.__doc)
    def writeOut(self,filename):
        self.__doc.write(filename,encoding="utf-8", xml_declaration=True, default_namespace=None, method="xml")

