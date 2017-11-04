const fs = require( 'fs' );
const deepExtend = require('deep-extend');

const Parser = require( './parser' );
const Logic = require( './logic' );

const extension = ".js.html";
const codebehind = ".codebehind.js";


function Template( options = {} ){
    if( options.views_folder && options.views_folder.slice( -1 ) !== '/' ){
        options.views_folder += "/";
    }

    this.options = deepExtend( {
        views_folder : '',
        logic : Logic,
    }, options );
}

Template.prototype.getViewPath = function( view_file ){
    let path_parts = view_file.split( /[\/\.]/g ),
        no_ext_path = this.options.views_folder + path_parts.join( '/' ),
        path = this.options.views_folder + path_parts.join( '/' ) + extension;

    if( !fs.existsSync( path  ) ){
        path_parts.push( "_" + path_parts.pop() );
        no_ext_path = this.options.views_folder + path_parts.join( '/' ),
        path = this.options.views_folder + path_parts.join( '/' ) + extension;

        if( !fs.existsSync( path  ) ){
            throw new Error( `View [${ view_file }] does not exists.` );
        }
    }

    return {
        relative_no_ext : path_parts.join( '/' ),
        relative : path_parts.join( '/' ) + extension,
        full_no_ext : no_ext_path,
        full : path,
    };

}

Template.prototype.new = function( view_file, Data = {}, Buffer ){
    let template;

    this.view_path = this.getViewPath( view_file );

    if( fs.existsSync( this.view_path.full ) ){
        template = fs.readFileSync( this.view_path.full, 'utf8' );
    }

    try{
        var CodeBehind = require( this.view_path.full_no_ext + codebehind );

        Data = CodeBehind( Data );
    }catch( err ){}

    let parser =  new Parser( this, template, Data, Buffer );

    return parser;
}

module.exports = Template;
