using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GMEModelStatisticsExporter.Statistics
{
    class Base
    {
        public int NumberOfFolders { get; set; }
        public int NumberOfModels { get; set; }
        public int NumberOfAtoms { get; set; }
        public int NumberOfReferences { get; set; }
        public int NumberOfConnections { get; set; }
        public int NumberOfSets { get; set; }
        //public int NumberOfBaseClasses { get; set; }
    }
}
