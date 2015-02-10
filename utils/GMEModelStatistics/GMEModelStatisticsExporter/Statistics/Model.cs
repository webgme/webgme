using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GMEModelStatisticsExporter.Statistics
{
    class Model : Base
    {
        public Dictionary<string, int> Attributes { get; set; }
        public Dictionary<string, int> Children { get; set; }        
        //public Dictionary<string, int> Levels { get; set; }
        //public Dictionary<string, int> BaseClasses { get; set; }

        public Dictionary<string, object> ContainmentTree { get; set; }
        public Dictionary<string, string> InheritanceTree { get; set; }

        public Model()
        {
            this.Attributes = new Dictionary<string, int>();
            this.Children = new Dictionary<string, int>();
            //this.Levels = new Dictionary<string, int>();
            //this.BaseClasses = new Dictionary<string, int>();

            this.ContainmentTree = new Dictionary<string, object>();
            this.InheritanceTree = new Dictionary<string, string>();
        }

        public void UpdateMaxValues()
        {
            // TODO: implement this
        }
    }
}
