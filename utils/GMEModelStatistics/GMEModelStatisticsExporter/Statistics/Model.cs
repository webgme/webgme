using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GMEModelStatisticsExporter.Statistics
{
    class Model : Base
    {
        public int MaxChildren { get; set; }
        public int MaxLevels { get; set; }
        public int MaxInheritance { get; set; }


        public Dictionary<string, int> Children { get; set; }
        public Dictionary<string, int> Levels { get; set; }
        public Dictionary<string, int> BaseClasses { get; set; }

        public Dictionary<string, object> ContainmentTree { get; set; }

        public Model()
        {
            this.Children = new Dictionary<string, int>();
            this.Levels = new Dictionary<string, int>();
            this.BaseClasses = new Dictionary<string, int>();

            this.ContainmentTree = new Dictionary<string, object>();
        }

        public void UpdateMaxValues()
        {
            // TODO: implement this
        }
    }
}
