using GME.MGA;
using GME.MGA.Meta;
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
        static int Main(string[] args)
        {
            bool errorInUsage = false;
            bool mgaIsGiven = true;
            bool generateTemplate = false;
            bool formattedOutput = false;
            string outputDirectory = Path.Combine(Environment.CurrentDirectory, "output");
            string statFileName = "sample_stats.json";
            string inputFilename = string.Empty;

            Directory.CreateDirectory(outputDirectory);

            // verify the input arguments
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i].StartsWith("-"))
                {
                    switch (args[i].Substring(1))
                    {
                        case "p":
                        case "-prettyPrint":
                            formattedOutput = true;
                            break;
                        case "t":
                        case "-template":
                            generateTemplate = true;
                            break;
                        default:
                            errorInUsage = true;
                            break;
                    }

                }
                else
                {
                    inputFilename = args[i];

                    if (i < args.Length - 1)
                    {
                        Console.WriteLine("Arguments after filename are ignored.");
                    }

                    break;
                }
            }

            if (File.Exists(inputFilename))
            {
                if (Path.GetExtension(inputFilename).ToLowerInvariant() == ".mga")
                {
                    mgaIsGiven = true;
                }
                else if (Path.GetExtension(inputFilename).ToLowerInvariant() == ".xme")
                {
                    mgaIsGiven = false;
                }
                else
                {
                    errorInUsage = true;
                }
            }
            else
            {
                errorInUsage = true;
            }


            if (generateTemplate)
            {
                Statistics.Statistics stats = Process(null);
                SerializeStats(stats, Path.Combine(outputDirectory, statFileName), formattedOutput);
                return 0;
            }

            if (errorInUsage)
            {
                Console.WriteLine("Usage: {0} [arguments] inputfilename.[mga|xme]", Path.GetFileName(System.Reflection.Assembly.GetExecutingAssembly().Location));
                Console.WriteLine("");
                Console.WriteLine("Arguments:");
                Console.WriteLine("  -p --prettyPrint   Indents the output json file.");
                Console.WriteLine("  -t --template      Generates a sample json file with random numbers.");
                return 1;
            }


            // copy the file to a temp directory
            string tempXmeFile = Path.Combine(outputDirectory, Path.GetFileNameWithoutExtension(inputFilename) + ".xme");
            string tempMgaFile = Path.Combine(outputDirectory, Path.GetFileNameWithoutExtension(inputFilename) + ".mga");
            statFileName = Path.GetFileNameWithoutExtension(inputFilename) + "_stat.json";

            MgaProject project = new MgaProject();

            if (mgaIsGiven)
            {
                if (inputFilename != tempMgaFile)
                {
                    Console.WriteLine("Copying MGA file to temp directory: {0}", tempMgaFile);
                    File.Copy(inputFilename, tempMgaFile, true);
                }

                Console.WriteLine("Opening project");
                int mgaversion;
                string paradigmName;
                string paradigmVersion;
                object paradigmGUID;
                bool ro_mode;

                project.QueryProjectInfo("MGA=" + tempMgaFile, out mgaversion, out paradigmName, out paradigmVersion, out paradigmGUID, out ro_mode);

                project.OpenEx("MGA=" + tempMgaFile, paradigmName, true);

                Console.WriteLine("Saving project as xme: {0}", tempXmeFile);
                // export to xme
                GME.MGA.Parser.MgaDumper dumper = new GME.MGA.Parser.MgaDumper();
                dumper.DumpProject(project, tempXmeFile);
            }
            else
            {
                if (inputFilename != tempXmeFile)
                {
                    Console.WriteLine("Copying XME file to temp directory: {0}", tempXmeFile);
                    File.Copy(inputFilename, tempXmeFile, true);
                }

                GME.MGA.Parser.MgaParser parser = new GME.MGA.Parser.MgaParser();
                string paradigmName;

                parser.GetXMLParadigm(tempXmeFile, out paradigmName);

                Console.WriteLine("Creating project");
                project.CreateEx("MGA=" + tempMgaFile, paradigmName, null);

                // import xme file
                Console.WriteLine("Importing project");

                parser.ParseProject(project, tempXmeFile);

                Console.WriteLine("Saving project as mga: {0}", tempMgaFile);
                project.Save("MGA=" + tempMgaFile);
            }

            if (project == null)
            {
                throw new Exception("Project is null.");
            }


            // process the project
            var statistics = Process(project);

            // read in file stats
            FileInfo mgaInfo = new FileInfo(tempMgaFile);
            FileInfo xmeInfo = new FileInfo(tempXmeFile);

            statistics.MgaSizeInBytes = mgaInfo.Length;
            statistics.XmeSizeInBytes = xmeInfo.Length;

            // serialize the object
            SerializeStats(statistics, Path.Combine(outputDirectory, statFileName), formattedOutput);


            return 0;
        }

        private static void SerializeStats(Statistics.Statistics stats, string filename, bool formattedOutput)
        {
            var settings = new Newtonsoft.Json.JsonSerializerSettings();

            if (formattedOutput)
            {
                settings.Formatting = Newtonsoft.Json.Formatting.Indented;
            }

            var serializer = Newtonsoft.Json.JsonSerializer.Create(settings);
            using (StreamWriter writer = new StreamWriter(filename))
            {
                serializer.Serialize(writer, stats);
            }
        }

        private static Statistics.Statistics Process(IMgaProject project)
        {
            Statistics.Statistics stats = new Statistics.Statistics();


            if (project == null)
            {
                GenerateDummyData(stats);
                return stats;
            }


            try
            {
                IMgaTerritory terr = project.BeginTransactionInNewTerr(transactiontype_enum.TRANSACTION_READ_ONLY);

                // process meta model

                stats.ParadigmName = project.MetaName;
                stats.ProjectName = project.Name;                               

                stats.MetaModel.RootGUID = GetGUIDFromInt(project.RootMeta.RootFolder.MetaRef);

                var rfTree = new Dictionary<string, object>();
                stats.Model.ContainmentTree[stats.MetaModel.RootGUID] = rfTree;

                foreach (MgaMetaAttribute attr in project.RootMeta.RootFolder.DefinedAttributes)
                {
                    string attrType = attr.ValueType.ToString();
                    int num = 0;

                    if (stats.MetaModel.Attributes.TryGetValue(attrType, out num))
                    {
                        stats.MetaModel.Attributes[attrType] = num + 1;
                    }
                    else
                    {
                        stats.MetaModel.Attributes[attrType] = 1;
                    }
                }

                foreach (MgaMetaFCO meta in project.RootMeta.RootFolder.DefinedFCOs)
                {
                    rfTree[GetGUIDFromInt(meta.MetaRef)] = new Dictionary<string, object>();

                    if (meta is MgaMetaModel)
                    {
                        stats.MetaModel.NumberOfModels += 1;
                    }
                    else if (meta is MgaMetaConnection)
                    {
                        stats.MetaModel.NumberOfConnections += 1;
                    }
                    else if (meta is MgaMetaSet)
                    {
                        stats.MetaModel.NumberOfSets += 1;
                    }
                    else if (meta is MgaMetaReference)
                    {
                        stats.MetaModel.NumberOfReferences += 1;
                    }
                    else if (meta is MgaMetaAtom)
                    {
                        stats.MetaModel.NumberOfAtoms += 1;
                    }
                }

                foreach (MgaMetaFolder meta in project.RootMeta.RootFolder.DefinedFolders)
                {
                    rfTree[GetGUIDFromInt(meta.MetaRef)] = new Dictionary<string, object>();
                    stats.MetaModel.NumberOfFolders += 1;
                }


                // process domain model
                VisitChildren(stats, project.RootFolder, stats.Model.ContainmentTree);

            }
            finally
            {
                project.AbortTransaction();
            }
            return stats;
        }

        private static string GetGUIDFromInt(int metaRef)
        {
            return (new Guid(metaRef, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)).ToString("D");
        }

        private static void VisitChildren(Statistics.Statistics stats, IMgaObject mgaObject, object subtree)
        {
            var tree = (Dictionary<string, object>)subtree;

            if (mgaObject is MgaFCO && (mgaObject as MgaFCO).ArcheType != null)
            {
                stats.Model.InheritanceTree[(new Guid(mgaObject.GetGuidDisp())).ToString("D")] =
                    (new Guid((mgaObject as MgaFCO).ArcheType.GetGuidDisp())).ToString("D");
            }
            else
            {
                stats.Model.InheritanceTree[(new Guid(mgaObject.GetGuidDisp())).ToString("D")] = GetGUIDFromInt(mgaObject.MetaBase.MetaRef);
            }

            if (mgaObject is MgaFCO)
            {
                var numAttr = (mgaObject as MgaFCO).Attributes.Count.ToString();
                int num = 0;
                if (stats.Model.Attributes.TryGetValue(numAttr, out num))
                {
                    stats.Model.Attributes[numAttr] = num + 1;
                }
                else
                {
                    stats.Model.Attributes[numAttr] = 1;
                }
            }

            if (mgaObject.ObjType == GME.MGA.Meta.objtype_enum.OBJTYPE_FOLDER ||
                mgaObject.ObjType == GME.MGA.Meta.objtype_enum.OBJTYPE_MODEL)
            {
                MgaObjects children = mgaObject.ChildObjects;
                int numChildren = children.Count;
                int number = 0;
                if (stats.Model.Children.TryGetValue(numChildren.ToString(), out number))
                {
                    stats.Model.Children[numChildren.ToString()] = number + 1;
                }
                else
                {
                    stats.Model.Children[numChildren.ToString()] = 1;
                }

                foreach (MgaObject child in children)
                {
                    string id = new Guid(child.GetGuidDisp()).ToString("D");
                    tree[id] = new Dictionary<string, object>();
                    VisitChildren(stats, child, tree[id]);
                }
            }
            else
            {
                int number = 0;
                if (stats.Model.Children.TryGetValue("0", out number))
                {
                    stats.Model.Children["0"] = number + 1;
                }
                else
                {
                    stats.Model.Children["0"] = 1;
                }
            }
            
            switch (mgaObject.ObjType)
            {
                case objtype_enum.OBJTYPE_ATOM:
                    stats.Model.NumberOfAtoms++;
                    break;
                case objtype_enum.OBJTYPE_MODEL:
                    stats.Model.NumberOfModels++;
                    break;
                case objtype_enum.OBJTYPE_FOLDER:
                    stats.Model.NumberOfFolders++;
                    break;
                case objtype_enum.OBJTYPE_CONNECTION:
                    stats.Model.NumberOfConnections++;
                    break;
                case objtype_enum.OBJTYPE_REFERENCE:
                    stats.Model.NumberOfReferences++;
                    break;
                case objtype_enum.OBJTYPE_SET:
                    stats.Model.NumberOfSets++;
                    break;
                default:
                    // TODO: ...
                    break;
            }



        }




        #region Dummy data generators
        private static void GenerateDummyData(Statistics.Statistics stats)
        {
            var random = new Random();

            stats.MgaSizeInBytes = random.Next(1024, 1024 * 1024 * 100);
            stats.XmeSizeInBytes = random.Next((int)stats.MgaSizeInBytes * 2, (int)stats.MgaSizeInBytes * 8);

            stats.ParadigmName = random.Next(0, 10) > 8 ? "MetaGME" : "MyParadigm_" + random.Next(0, 10);
            stats.ProjectName = "MyProject_" + random.Next(50, 99);

            // meta model info
            stats.MetaModel.NumberOfFolders = random.Next(0, 10);
            stats.MetaModel.NumberOfModels = random.Next(0, 10);
            stats.MetaModel.NumberOfReferences = random.Next(0, 10);
            stats.MetaModel.NumberOfConnections = random.Next(0, 10);
            stats.MetaModel.NumberOfSets = random.Next(0, 10);
            stats.MetaModel.NumberOfAtoms = random.Next(0, 10);

            // model info


            stats.Model.NumberOfFolders = random.Next(0, 100);
            stats.Model.NumberOfModels = random.Next(0, 100);
            stats.Model.NumberOfReferences = random.Next(0, 100);
            stats.Model.NumberOfConnections = random.Next(0, 100);
            stats.Model.NumberOfSets = random.Next(0, 100);

            for (int i = 0; i < random.Next(2, 100); i++)
            {
                stats.Model.Children[i.ToString()] = random.Next(0, 100);
            }

            //for (int i = 0; i < random.Next(2, 15); i++)
            //{
            //    stats.Model.Levels[i.ToString()] = random.Next(1, 10);
            //}

            //for (int i = 0; i < random.Next(2, 10); i++)
            //{
            //    stats.Model.BaseClasses[i.ToString()] = random.Next(0, 10);
            //}

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
        #endregion
    }
}
