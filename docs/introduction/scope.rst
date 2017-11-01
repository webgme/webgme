The Scope of this Tutorial
===========================
This tutorial will guide you on how to build a Design Studio with webgme. If both of these terms are completely new to you,
that's fine. It will also explain what these are.

The tutorial will go through all steps needed to host your own deployment, create your own meta-model, implement interpreters and
customize the visualization. In order to give you an idea of how all these things play a roll in a Design Studio, these steps
will be illustrated by an example of a simple Analog Circuit domain. In short we will:

* Create a meta-model suitable for modeling electrical circuits
* Write an interpreter that generates `Modelica <https://modelica.org>`_ code
* Extend the interpreter to simulate the generated Modelica code using `OpenModelica <https://openmodelica.org>`_
* Visualize the simulation results


Target Audience
----------------
This is for you, a researcher or an engineer, who might have seen an example of an application build up in webgme and are interested
in building your application fitting your domain.

It also for you who just heard about webgme and are new to meta-modeling and would like to learn more about it.

Prerequisites
-------------
Although we try to explain the `underlying technologies that webgme depend on <../getting_started/dependencies.rst>`_,
users are assumed to have a basic understanding of these. If not, it's recommended to use the internet and read up on the basics
behind these technologies. In addition it's required that you have some experience in JavaScript, HTML5 and CSS3. It should be noted that unless
you really need to customize the visualization, JavaScript will suffice.
