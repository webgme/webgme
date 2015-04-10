using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GMEModelStatisticsExporter.Statistics
{
    class MetaModel : Base
    {
        public string RootGUID { get; set; }

        public Dictionary<string, int> Attributes { get; set; }

        public MetaModel()
        {
            this.Attributes = new Dictionary<string, int>();
        }
    }
}
