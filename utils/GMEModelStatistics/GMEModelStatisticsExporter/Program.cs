using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GMEModelStatisticsExporter
{
    class Program
    {
        static void Main(string[] args)
        {
            // TODO: verify the input arguments

            // TODO: move the file to a temp directory

            // TODO: get mga and xme versions

            // TODO: read in file stats

            // TODO: process the project

            Statistics.Statistics stats = Process();

            // TODO: serialize the object

            var settings = new Newtonsoft.Json.JsonSerializerSettings()
            {
                Formatting = Newtonsoft.Json.Formatting.Indented
            };

            var serializer = Newtonsoft.Json.JsonSerializer.Create(settings);
            using (StreamWriter writer = new StreamWriter("sample_stats.json"))
            {
                serializer.Serialize(writer, stats);
            }

        }

        private static Statistics.Statistics Process()
        {
            Statistics.Statistics stats = new Statistics.Statistics();


            GenerateDummyData(stats);


            return stats;
        }

        private static void GenerateDummyData(Statistics.Statistics stats)
        {
            var random = new Random();

            stats.MgaSizeInBytes = random.Next(1024, 1024 * 1024 * 100);
            stats.XmeSizeInBytes = random.Next((int)stats.MgaSizeInBytes * 2, (int)stats.MgaSizeInBytes * 8);

            stats.ParadigmName = random.Next(0, 10) > 8 ? "MetaGME" : "MyParadigm_" + random.Next(0, 10);


            // meta model info
            stats.MetaModel.NumberOfFolders = random.Next(0, 10);
            stats.MetaModel.NumberOfModels = random.Next(0, 10);
            stats.MetaModel.NumberOfReferences = random.Next(0, 10);
            stats.MetaModel.NumberOfConnections = random.Next(0, 10);
            stats.MetaModel.NumberOfSets = random.Next(0, 10);

            stats.MetaModel.NumberOfBaseClasses = 0;

            // model info


            stats.Model.NumberOfFolders = random.Next(0, 100);
            stats.Model.NumberOfModels = random.Next(0, 100);
            stats.Model.NumberOfReferences = random.Next(0, 100);
            stats.Model.NumberOfConnections = random.Next(0, 100);
            stats.Model.NumberOfSets = random.Next(0, 100);

            stats.Model.NumberOfBaseClasses = 0;

            for (int i = 0; i < random.Next(2, 100); i++)
            {
                stats.Model.Children[i.ToString()] = random.Next(0, 100);
            }

            for (int i = 0; i < random.Next(2, 15); i++)
            {
                stats.Model.Levels[i.ToString()] = random.Next(1, 10);
            }

            for (int i = 0; i < random.Next(2, 10); i++)
            {
                stats.Model.BaseClasses[i.ToString()] = random.Next(0, 10);
            }

            var rootId = Guid.NewGuid().ToString("D");
            stats.Model.ContainmentTree[rootId] = new Dictionary<string, object>();

            GenerateTree(stats.Model.ContainmentTree[rootId], 10, 40);

        }

        private static void GenerateTree(object subtree, int depth, int maxChildOnEachLevel)
        {
            if (depth < 1)
            {
                return;
            }

            var random = new Random();
            var tree = (Dictionary<string, object>)subtree;

            for (int i = 0; i < random.Next(1, maxChildOnEachLevel); i++)
            {
                var id = Guid.NewGuid().ToString("D");
                tree[id] = new Dictionary<string, object>();
                GenerateTree(tree[id], random.Next(0, depth), maxChildOnEachLevel);
            }
        }

    }
}
