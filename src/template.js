const fs = require( 'fs' );
const path = require( 'path' );
const deepExtend = require( 'deep-extend' );

const Parser = require( './parser' );
const Logic = require( './logic' );

const extension = ".jshtml";
const codebehind = ".codebehind.js";


function Template( options = {} ){
    this.options = deepExtend( {
        views_folder : '.',
        logic : Logic,
        shared_data : {},
    }, options );

    if( !path.isAbsolute( this.options.views_folder ) ){
        this.options.views_folder = path.resolve( process.cwd(), this.options.views_folder );
    }

    this.dependencies = [];
}

Template.prototype.addDependency = function( file_path ){
    if( this.dependencies.indexOf( file_path ) == -1 ){
        this.dependencies.push( file_path );
    }
}

Template.prototype.setViewPath = function( view_file ){
    this.view_path = this.getViewPath( view_file );
}

Template.prototype.getViewPath = function( view_file ){
    let path_parts = view_file.split( /[\/\.]/g ),
        no_ext_path = path.resolve( this.options.views_folder, path.join( ...path_parts ) ),
        ext_path = no_ext_path + extension;

    if( !fs.existsSync( ext_path  ) ){
        path_parts.push( "_" + path_parts.pop() );
        no_ext_path = path.resolve( this.options.views_folder, path.join( ...path_parts ) );
        ext_path = no_ext_path + extension;

        if( !fs.existsSync( ext_path  ) ){
            throw new Error( `View [${ view_file }] does not exists.` );
        }
    }

    return {
        full_no_ext : no_ext_path,
        full : ext_path,
    };

}

Template.prototype.unifyData = function( Data = {} ){
    try{
        delete require.cache[ this.view_path.full_no_ext + codebehind ];
        var CodeBehind = require( this.view_path.full_no_ext + codebehind );

        this.addDependency( this.view_path.full_no_ext + codebehind );
        Data = CodeBehind( Data );
    }catch( err ){}

    return Data;
}

Template.prototype.new = function( view_file, Data = {}, Buffer ){
    let template;

    this.setViewPath( view_file );

    this.addDependency( this.view_path.full );

    if( fs.existsSync( this.view_path.full ) ){
        template = fs.readFileSync( this.view_path.full, 'utf8' );
    }

    Data = deepExtend( this.options.shared_data, Data );
    this.unifyData( Data )

    let parser =  new Parser( this, template, Data, Buffer );

    return parser;
}

module.exports = Template;
