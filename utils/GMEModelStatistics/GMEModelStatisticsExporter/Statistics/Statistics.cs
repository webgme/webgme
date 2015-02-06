using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GMEModelStatisticsExporter.Statistics
{
    class Statistics
    {
        private string _paradigmName;

        public string ParadigmName
        {
            get { return this._paradigmName; }
            set { this._paradigmName = value; }
        }

        public string ProjectName { get; set; }

        public long XmeSizeInBytes { get; set; }
        public long MgaSizeInBytes { get; set; }

        public bool IsMetaModel
        {
            get { return this._paradigmName == "MetaGME"; }
            set { /* do nothing, needed for serialization purposes */ }
        }

        public MetaModel MetaModel { get; set; }
        public Model Model { get; set; }

        public Statistics()
        {
            this.MetaModel = new MetaModel();
            this.Model = new Model();
        }
    }
}
